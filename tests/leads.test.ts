import { describe, expect, it } from "vitest";
import type { Job } from "../src/jobs/normalize.js";
import type { Board } from "../src/sources/companies.js";
import { formatUnresolved, parseLeads, resolveLeads, sameTitle, slugCandidates } from "../src/sources/leads.js";

const posting = (board: Board, title: string): Job => ({
  id: `${board.slug}-${title}`, source: `${board.ats}:${board.slug}`, company: board.company, title, url: `https://job-boards.greenhouse.io/${board.slug}/jobs/1`, ats: board.ats,
  locations: ["Remote"], postedAt: "2026-10-01", terms: [], sponsorship: "unknown", degrees: [], category: null,
});

/** Boards that exist, by "ats:slug", with the titles each lists. Every other name has no board. */
const world = (boards: Record<string, string[]>) => {
  const asked: string[] = [];
  const fetch = async (b: Board) => {
    asked.push(`${b.ats}:${b.slug}`);
    const titles = boards[`${b.ats}:${b.slug}`];
    if (!titles) throw new Error("404");
    return titles.map((t) => posting(b, t));
  };
  return { fetch, asked };
};

describe("a leads file", () => {
  it("keeps the rows that name a company and a title", () => {
    const leads = parseLeads(JSON.stringify([{ company: "Acme", title: "Brand Designer", pay: "$80,000 a year", source: "indeed" }, { company: "", title: "x" }, { title: "No company" }]));
    expect(leads).toEqual([{ company: "Acme", title: "Brand Designer", pay: "$80,000 a year", source: "indeed" }]);
    expect(() => parseLeads("{}")).toThrow(/array/);
  });
});

describe("board names for a company", () => {
  it("tries the words joined, hyphenated, and the first word", () => {
    expect(slugCandidates("Acme Financial Technology")).toEqual(["acmefinancialtechnology", "acme-financial-technology", "acme"]);
    expect(slugCandidates("Acme, Inc.")).toEqual(["acme"]);
    expect(slugCandidates("Salt & Stone Co")).toEqual(["saltandstone", "saltstone", "salt-and-stone", "salt"]);
    expect(slugCandidates("!!!")).toEqual([]);
  });
});

describe("the same title", () => {
  it("looks past case, place words and abbreviations", () => {
    expect(sameTitle("Visual Designer", "Visual Designer ")).toBe(true);
    expect(sameTitle("Sr. Designer", "Senior Designer")).toBe(true);
    expect(sameTitle("Graphic Designer (Remote)", "Graphic Designer")).toBe(true);
    expect(sameTitle("Brand Designer", "Brand Designer, Marketing")).toBe(true);
  });
  it("does not take one word for a match", () => {
    expect(sameTitle("Designer", "Product Designer")).toBe(false);
    expect(sameTitle("Brand Designer", "Brand Manager")).toBe(false);
    expect(sameTitle("Senior Brand Designer", "Brand Designer")).toBe(true);
  });
});

describe("looking a lead up", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  it("finds the posting on the company's board and keeps the board", async () => {
    const { fetch } = world({ "greenhouse:acme": ["Visual Designer", "Staff Engineer"] });
    const r = await resolveLeads([{ company: "Acme Inc", title: "Visual Designer", source: "indeed" }], { fetch, notesFile: null, now });
    expect(r.jobs.map((j) => j.title)).toEqual(["Visual Designer"]);
    expect(r.boards).toEqual([{ ats: "greenhouse", slug: "acme", company: "Acme Inc" }]);
    expect(r.unresolved).toEqual([]);
  });
  it("does not take a board with the same name and other work", async () => {
    // Another company answers to the first word of the name.
    const { fetch } = world({ "lever:northwind": ["Account Executive"] });
    const lead = { company: "Northwind Studio", title: "Motion Designer", link: "https://example.com/j/1", source: "indeed" };
    const r = await resolveLeads([lead], { fetch, notesFile: null, now });
    expect(r.jobs).toEqual([]);
    expect(r.boards).toEqual([]);
    expect(r.unresolved).toEqual([lead]);
  });
  it("leaves the one lead a found board does not list", async () => {
    const { fetch } = world({ "ashby:acme": ["Brand Designer"] });
    const r = await resolveLeads(
      [{ company: "Acme", title: "Brand Designer", source: "indeed" }, { company: "Acme", title: "Video Editor", source: "indeed" }],
      { fetch, notesFile: null, now },
    );
    expect(r.jobs).toHaveLength(1);
    expect(r.unresolved.map((l) => l.title)).toEqual(["Video Editor"]);
  });
  it("tries a board the search already knows first", async () => {
    const { fetch, asked } = world({ "lever:acme-co": ["Brand Designer"] });
    const r = await resolveLeads([{ company: "Acme", title: "Brand Designer", source: "indeed" }], { fetch, notesFile: null, now, known: [{ ats: "lever", slug: "acme-co", company: "Acme" }] });
    expect(r.jobs).toHaveLength(1);
    expect(asked).toEqual(["lever:acme-co"]);
  });
  it("names what is left, with the link", () => {
    expect(formatUnresolved([{ company: "Acme", title: "Designer", location: "Remote", pay: "$70,000 a year", link: "https://example.com/j/2", source: "indeed" }])).toBe(
      "Acme: Designer, Remote, $70,000 a year\n  https://example.com/j/2",
    );
  });
});
