/**
 * What the search is for. The profile's `search` section names a role, the titles and levels
 * wanted, a pay floor and where the work may be; this file turns that into the title filter, the
 * sources and the wording of the rating questions. With no `search` section the target is the
 * one the tool began with: software internships and new-grad roles.
 *
 * To add a kind of work, add an entry to ROLES and its name to `search.role` in the schema.
 */
import { SearchSchema, type Search } from "../profile/schema.js";
import { DESIGN_SEED_BOARDS, SEED_BOARDS, type Board } from "../sources/companies.js";

export type Level = Search["levels"][number];

type Role = {
  /** The word for the role in a skip reason: "not a software role". */
  noun: string;
  /** Whether a title can be this role. A title that fails is skipped before JEV sees it. */
  passes: (title: string) => boolean;
  /** A title that plainly names the role. A company board lists every opening it has; outside the student search only these are taken from it. */
  names: RegExp;
  /** The JEV question that settles the role from the description, and its key in the answers. */
  roleKey: string;
  roleQuestion: (titles: string[]) => { text: string; yes: string; no: string };
  /** The question behind the stack_match score, and the word for it in a reason. */
  skillQuestion: string;
  skillLabel: string;
  /** Ask whether the interviews are practical rather than algorithm puzzles. */
  practicalInterview: boolean;
  /** The public GitHub lists of internships and new-grad roles carry this kind of work. */
  onLists: boolean;
  boards: Board[];
};

const NON_SOFTWARE_TITLE =
  /\b(hardware|mechanical|electrical|civil|chemical|aerospace|manufacturing|industrial|process|structural|rf|asic|fpga|pcb|silicon|analog|mixed[- ]signal|product manager|program manager|project manager|technical program|product design|ux|ui designer|graphic|marketing|sales|recruit|finance intern|accounting|legal|hr |human resources|supply chain|operations analyst|business analyst|data scientist|data science|data analyst|quant|trading|research scientist|phd|postdoc|technician|physical|optics|photonics|materials|biomed|clinical|nurse|teacher)\b/i;
/** A title that matches NON_SOFTWARE_TITLE is rescued when it also says one of these. */
const SOFTWARE_TITLE = /software|developer|programm|full[- ]stack|backend|frontend|front[- ]end|back[- ]end|\bswe\b|web engineer|mobile engineer|platform engineer/i;

const DESIGN_TITLE = /\bdesign(er|ers)?\b|art director|motion graphics|multimedia|illustrator|animator|production artist|video editor|\bcreative\b|\bvisual\b/i;
/** Work that says "design" and is another trade: chip and building design, teaching, engineering, selling. */
const NOT_DESIGN_TITLE =
  /\b(engineer|engineering|developer|instructional|learning|curriculum|interior|industrial|mechanical|electrical|hardware|asic|fpga|rf|silicon|analog|physical design|architect|fashion|floral|game design|level design|sound|lighting|systems? design|researcher|scientist|sales|recruit|account executive|account manager|program manager|project manager)\b/i;

export const ROLES: Record<Search["role"], Role> = {
  software: {
    noun: "software",
    passes: (t) => !(NON_SOFTWARE_TITLE.test(t) && !SOFTWARE_TITLE.test(t)),
    names: /software|developer|programm|engineer|\bswe\b|full[- ]stack|back[- ]?end|front[- ]?end/i,
    roleKey: "is_software_role",
    roleQuestion: () => ({
      text: "Is this a software engineering or software developer role (writing application, backend, frontend, mobile, infrastructure or platform code)?",
      yes: "The day-to-day work is writing software",
      no: "Hardware, data science, analytics, product, research, IT support, or anything else",
    }),
    skillQuestion: "How well does the candidate's technical stack match what the posting asks for?",
    skillLabel: "stack",
    practicalInterview: true,
    onLists: true,
    boards: SEED_BOARDS,
  },
  design: {
    noun: "design",
    passes: (t) => DESIGN_TITLE.test(t) && !NOT_DESIGN_TITLE.test(t),
    names: DESIGN_TITLE,
    roleKey: "is_target_role",
    roleQuestion: (titles) => ({
      text: "Is this a visual design role of the kind the candidate is looking for (graphic, brand, visual, motion, multimedia, web or digital design: making the visual work itself)?",
      yes: titles.length ? `The day-to-day work is that of one of these titles, or very close to one: ${titles.join(", ")}` : "The day-to-day work is making visual design",
      no: "Instructional or learning design, UX research, engineering, interior, industrial or fashion design, marketing or management with no design work, or anything else",
    }),
    skillQuestion: "How well do the candidate's design tools, media and kinds of work match what the posting asks for?",
    skillLabel: "tools",
    practicalInterview: false,
    onLists: false,
    boards: DESIGN_SEED_BOARDS,
  },
};

const phrase = (words: string) => new RegExp(`(^|[^a-z0-9])${words.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}($|[^a-z0-9])`, "i");

export type Target = Role & {
  search: Search;
  /** Only internships and new-grad roles are wanted: the student search, with its term and graduation questions. */
  earlyCareer: boolean;
  /** Why a title is not wanted, or null. */
  titleReason: (title: string) => string | null;
  /** A title a company board should hand over when the search is not the student one. */
  namesRole: (title: string) => boolean;
  /** Matches a location line that names one of the home places. Null when the profile sets none. */
  home: RegExp | null;
  boards: Board[];
};

export function targetOf(profile: { search?: Search | undefined } = {}): Target {
  const search = profile.search ?? SearchSchema.parse(undefined);
  const role = ROLES[search.role];
  const wanted = search.titles.map(phrase);
  const excluded = search.excludeTitles.filter((w) => w.trim()).map((w) => ({ word: w.trim(), re: phrase(w) }));
  const isWanted = (title: string) => wanted.some((re) => re.test(title));
  const homes = (search.location?.home ?? []).map((h) => (h.split(",")[0] ?? "").trim()).filter(Boolean);
  return {
    ...role,
    search,
    earlyCareer: search.levels.every((l) => l === "internship" || l === "new_grad"),
    titleReason: (title) => {
      const out = excluded.find((e) => e.re.test(title));
      if (out) return `title says "${out.word}"`;
      // A title the person asked for by name is theirs to judge, whatever else it says.
      if (isWanted(title)) return null;
      return role.passes(title) ? null : `title is not a ${role.noun} role`;
    },
    namesRole: (title) => isWanted(title) || role.names.test(title),
    home: homes.length ? new RegExp(homes.map((h) => phrase(h).source).join("|"), "i") : null,
    boards: [...role.boards, ...search.boards],
  };
}

/** The target when no profile is at hand: the search the tool began with. */
export const DEFAULT_TARGET: Target = targetOf();

export const LEVEL_WORDS: Record<Level, string> = {
  internship: "an internship",
  new_grad: "entry level",
  mid: "mid level",
  senior: "senior",
  lead: "a director or department lead",
};
