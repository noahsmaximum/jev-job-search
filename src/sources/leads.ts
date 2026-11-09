/**
 * Leads: postings found on a site the tool cannot apply through, such as Indeed. A lead names a
 * company and a title. The tool looks for the same posting on the company's own public board
 * (Greenhouse, Lever, Ashby), where it can read the form. A lead it finds there becomes a job like
 * any other, and the board is polled with the rest. A lead it does not find is left for the
 * person, with its link.
 *
 * Leads are files named `*.leads.json` in data/imports/. The /indeed skill writes one.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { LEADS, PATHS } from "../config.js";
import type { Job } from "../jobs/normalize.js";
import { mapLimit } from "../util/http.js";
import { writeAtomic } from "../util/store.js";
import { fetchAshbyBoard } from "./ats/ashby.js";
import { fetchGreenhouseBoard } from "./ats/greenhouse.js";
import { fetchLeverBoard } from "./ats/lever.js";
import type { Board } from "./companies.js";

export const LeadSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  /** YYYY-MM-DD. */
  postedAt: z.string().optional(),
  /** Pay as the site states it. Shown to the person, never used to decide. */
  pay: z.string().optional(),
  /** Where the lead was seen. */
  link: z.string().optional(),
  source: z.string().default("lead"),
});
export type Lead = z.infer<typeof LeadSchema>;

export function parseLeads(text: string): Lead[] {
  const raw: unknown = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error("A leads file holds a JSON array");
  return raw.flatMap((r) => {
    const p = LeadSchema.safeParse(r);
    return p.success ? [p.data] : [];
  });
}

export function readLeads(dir: string = PATHS.imports, log: (m: string) => void = () => {}): Lead[] {
  if (!existsSync(dir)) return [];
  const out: Lead[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".leads.json"))) {
    try {
      const leads = parseLeads(readFileSync(path.join(dir, f), "utf8"));
      log(`[sources] ${f}: ${leads.length} leads`);
      out.push(...leads);
    } catch (e) {
      log(`[sources] ${f} failed: ${String(e)}`);
    }
  }
  return out;
}

const COMPANY_SUFFIX = /\b(incorporated|inc|llc|l\.l\.c|ltd|limited|corp|corporation|co|company|plc|gmbh|usa|us|group|holdings)\b\.?/gi;

/** The names a company's board may go by: its words joined, hyphenated, and its first word alone. */
export function slugCandidates(company: string): string[] {
  const words = company
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(COMPANY_SUFFIX, " ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (!words.length) return [];
  const plain = words.filter((w) => w !== "and" && w !== "the");
  const out = [words.join(""), plain.join(""), words.join("-"), plain[0] ?? ""];
  return [...new Set(out.filter((s) => s.length >= 2))].slice(0, LEADS.maxSlugs);
}

const key = (s: string) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(remote|hybrid|on[- ]?site)\b/g, " ")
    .replace(/\b(sr|snr)\b\.?/g, "senior")
    .replace(/\bjr\b\.?/g, "junior")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * The same posting under two spellings. A guessed board name can belong to another company, so a
 * board counts as the lead's only when it carries the lead's title.
 */
export function sameTitle(a: string, b: string): boolean {
  const x = key(a);
  const y = key(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.split(" ").length >= 2 && ` ${long} `.includes(` ${short} `);
}

export type BoardFetch = (board: Board) => Promise<Job[]>;

const fetchBoard: BoardFetch = (b) =>
  b.ats === "greenhouse" ? fetchGreenhouseBoard(b.slug, b.company) : b.ats === "lever" ? fetchLeverBoard(b.slug, b.company) : fetchAshbyBoard(b.slug, b.company);

/** What an earlier search learned about a company: its board, or that none was found on that day. */
const NoteSchema = z.record(z.string(), z.object({ board: z.object({ ats: z.enum(["greenhouse", "lever", "ashby"]), slug: z.string(), company: z.string() }).nullable(), at: z.string() }));
type Notes = z.infer<typeof NoteSchema>;

function readNotes(file: string): Notes {
  if (!existsSync(file)) return {};
  try {
    const p = NoteSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
    return p.success ? p.data : {};
  } catch {
    return {};
  }
}

export type LeadResult = {
  /** Postings found on a company's own board. */
  jobs: Job[];
  /** The boards they were found on, to poll with the rest. */
  boards: Board[];
  /** Leads with no posting on a board the tool reads. */
  unresolved: Lead[];
};

export async function resolveLeads(
  leads: Lead[],
  opts: { fetch?: BoardFetch; notesFile?: string | null; now?: Date; known?: Board[] } = {},
): Promise<LeadResult> {
  const fetch = opts.fetch ?? fetchBoard;
  const now = opts.now ?? new Date();
  const file = opts.notesFile === undefined ? PATHS.leadBoards : opts.notesFile;
  const notes: Notes = file ? readNotes(file) : {};
  const byCompany = new Map<string, Lead[]>();
  for (const l of leads) {
    const k = key(l.company);
    if (k) byCompany.set(k, [...(byCompany.get(k) ?? []), l]);
  }
  const known = new Map((opts.known ?? []).map((b) => [key(b.company), b]));
  const result: LeadResult = { jobs: [], boards: [], unresolved: [] };

  await mapLimit([...byCompany.entries()], LEADS.concurrency, async ([k, group]) => {
    const company = (group[0] as Lead).company;
    const note = notes[k];
    const fresh = note && now.getTime() - new Date(note.at).getTime() < LEADS.retryDays * 86_400_000;
    // A board found before is read again: its postings change. A company with none found is left alone for a while.
    if (note && !note.board && fresh) {
      result.unresolved.push(...group);
      return;
    }
    const first = note?.board ?? known.get(k);
    const tries: Board[] = [...(first ? [first] : []), ...slugCandidates(company).flatMap((slug) => LEADS.ats.map((ats) => ({ ats, slug, company })))];
    let found: Board | null = null;
    let left = group;
    for (const board of tries) {
      const postings = await fetch(board).catch(() => [] as Job[]);
      const matched = postings.filter((p) => group.some((l) => sameTitle(l.title, p.title)));
      if (!matched.length) continue;
      found = board;
      result.jobs.push(...matched);
      left = group.filter((l) => !matched.some((p) => sameTitle(l.title, p.title)));
      break;
    }
    if (found) result.boards.push(found);
    result.unresolved.push(...left);
    notes[k] = { board: found ?? note?.board ?? null, at: now.toISOString() };
  });

  if (file) writeAtomic(file, JSON.stringify(notes, null, 1));
  return result;
}

/** The leads left for the person, one line each. */
export function formatUnresolved(leads: Lead[]): string {
  return leads.map((l) => `${l.company}: ${l.title}${l.location ? `, ${l.location}` : ""}${l.pay ? `, ${l.pay}` : ""}${l.link ? `\n  ${l.link}` : ""}`).join("\n");
}
