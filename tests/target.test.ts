import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { preFilter } from "../src/jobs/hardFilters.js";
import type { Job } from "../src/jobs/normalize.js";
import { FIT_QUESTIONS, buildFitState, fitQuestions, scoreFromAnswers } from "../src/jobs/rate.js";
import { targetOf } from "../src/jobs/target.js";
import { ProfileSchema, SearchSchema } from "../src/profile/schema.js";
import { fileBoxWants } from "../src/forms/mapForm.js";
import type { Answer } from "../src/jev/types.js";

const now = new Date("2026-10-02T12:00:00Z");
const example = JSON.parse(readFileSync("data/profile.example.json", "utf8"));
const designSearch = {
  role: "design",
  titles: ["Graphic Designer", "Motion Designer", "Brand Designer"],
  excludeTitles: ["UX"],
  levels: ["mid", "senior"],
  employment: ["full_time"],
  minSalary: 70000,
  location: { home: ["Springfield, IL"], radiusMiles: 30, elsewhere: "skip" },
};
const design = targetOf({ search: SearchSchema.parse(designSearch) });
const designProfile = ProfileSchema.parse({ ...example, search: designSearch });

const job = (over: Partial<Job> = {}): Job => ({
  id: "j", source: "t", company: "Acme", title: "Senior Graphic Designer", url: "https://job-boards.greenhouse.io/acme/jobs/1", ats: "greenhouse",
  locations: ["Remote"], postedAt: "2026-10-01", terms: [], sponsorship: "unknown", degrees: [], category: null, ...over,
});
const filter = (title: string) => preFilter(job({ title }), now, () => false, { authorized: true, citizen: true }, undefined, undefined, design);

const answers = (over: Record<string, Partial<Answer>> = {}): Record<string, Answer> => {
  const base: Record<string, Answer> = {
    is_target_role: { type: "noul", noul: 0.97 },
    level: { type: "choice", choice: "senior", confidence: 0.9, probabilities: {} },
    is_unpaid: { type: "noul", noul: 0.02 },
    needs_advanced_degree: { type: "noul", noul: 0.02 },
    work_auth: { type: "choice", choice: "unclear", confidence: 0.6, probabilities: {} },
    stack_match: { type: "score", score: 3, legend: {}, probabilities: {}, confidence: 0.8 },
    experience_match: { type: "score", score: 3, legend: {}, probabilities: {}, confidence: 0.8 },
    location_tier: { type: "choice", choice: "remote", confidence: 0.9, probabilities: {} },
    callback_likelihood: { type: "score", score: 3, legend: { "3": "Likely" }, probabilities: {}, confidence: 0.8 },
    needs_account: { type: "noul", noul: 0.05 },
    requires_references: { type: "noul", noul: 0.05 },
    employment_type: { type: "choice", choice: "full_time", confidence: 0.9, probabilities: {} },
    pay_stated: { type: "noul", noul: 0.9 },
    pay_below_floor: { type: "noul", noul: 0.05 },
    work_place: { type: "choice", choice: "remote", confidence: 0.9, probabilities: {} },
  };
  for (const [k, v] of Object.entries(over)) base[k] = { ...(base[k] as Answer), ...v } as Answer;
  return base;
};
const rate = (over: Record<string, Partial<Answer>> = {}, j: Partial<Job> = {}, remoteWanted = true) =>
  scoreFromAnswers(job(j), answers(over), now, { authorized: true, citizen: true }, design, remoteWanted);

describe("a profile with no search section", () => {
  it("is the software student search, with the questions unchanged", () => {
    const profile = ProfileSchema.parse(example);
    expect(profile.search).toEqual({ role: "software", titles: [], excludeTitles: [], levels: ["internship", "new_grad"], employment: [], boards: [] });
    const q = fitQuestions(profile);
    expect(Object.keys(q)).toEqual(Object.keys(FIT_QUESTIONS));
    expect(q.is_software_role).toEqual(FIT_QUESTIONS.is_software_role);
    expect(buildFitState(job(), profile, now).candidate).not.toHaveProperty("looking_for");
  });
  it("needs no GitHub link", () => {
    const { github: _github, ...links } = example.links;
    expect(ProfileSchema.safeParse({ ...example, links }).success).toBe(true);
  });
});

describe("the design title filter", () => {
  it.each(["Graphic Designer", "Senior Motion Designer", "Art Director", "Visual Designer, Brand", "Multimedia Designer", "Creative Lead"])("keeps %s", (t) => {
    expect(filter(t)).toBeNull();
  });
  it.each(["Software Engineer", "Design Engineer", "Instructional Designer", "ASIC Design Lead", "Interior Designer", "Account Executive"])("drops %s", (t) => {
    expect(filter(t)).toMatch(/not a design role/);
  });
  it("drops a title the profile excludes, and keeps one it names", () => {
    expect(filter("UX Designer")).toMatch(/UX/);
    expect(filter("Graphic Designer, Engineering Brand")).toBeNull();
  });
  it("takes from a company board only the titles that name the role", () => {
    expect(design.namesRole("Brand Designer")).toBe(true);
    expect(design.namesRole("Staff Software Engineer")).toBe(false);
    expect(design.earlyCareer).toBe(false);
    expect(design.onLists).toBe(false);
  });
});

describe("the design questions", () => {
  const q = fitQuestions(designProfile);
  it("ask about the role wanted and leave out the student questions", () => {
    expect(q).not.toHaveProperty("is_software_role");
    expect(q).not.toHaveProperty("term");
    expect(q).not.toHaveProperty("graduation_excluded");
    expect(q).not.toHaveProperty("interview_practical");
    expect(JSON.stringify(q.is_target_role)).toContain("Motion Designer");
    expect(JSON.stringify(q.pay_below_floor)).toContain("70,000");
    expect(JSON.stringify(q.work_place)).toContain("within about 30 miles of Springfield, IL");
    for (const k of Object.keys(answers())) expect(q).toHaveProperty(k);
  });
  it("tell JEV what the candidate is looking for", () => {
    const candidate = buildFitState(job(), designProfile, now).candidate as Record<string, unknown>;
    expect(candidate.looking_for).toEqual({ titles: designSearch.titles, levels: designSearch.levels });
    expect(candidate.lives_in).toBe("Edmonton, Alberta, Canada");
  });
});

describe("the design score", () => {
  it("applies to a senior remote full-time role that pays enough", () => {
    const fit = rate();
    expect(fit.skipReason).toBeNull();
    expect(fit.decision).toBe("apply");
    expect(fit.reasons).toContain("remote");
    expect(fit.reasons.some((r) => r.startsWith("tools "))).toBe(true);
  });
  it("skips another kind of work, level, employment or pay", () => {
    expect(rate({ is_target_role: { noul: 0.2 } }).skipReason).toBe("not a design role");
    expect(rate({ level: { choice: "new_grad" } }).skipReason).toBe("the role is entry level, not mid level or senior");
    expect(rate({ level: { choice: "lead" } }).skipReason).toMatch(/director/);
    expect(rate({ level: { choice: "mid" } }).skipReason).toBeNull();
    expect(rate({ employment_type: { choice: "contract" } }).skipReason).toBe("not full time (contract)");
    expect(rate({ employment_type: { choice: "unclear" } }).skipReason).toBeNull();
    expect(rate({ pay_below_floor: { noul: 0.9 } }).skipReason).toBe("pays below 70,000 a year");
  });
  it("keeps a role that states no pay, and says so", () => {
    const fit = rate({ pay_stated: { noul: 0.05 } });
    expect(fit.skipReason).toBeNull();
    expect(fit.reasons).toContain("pay not stated");
  });
  it("ranks by where the work may be", () => {
    expect(rate({ work_place: { choice: "elsewhere" } }).skipReason).toBe("not remote and not near Springfield, IL");
    expect(rate({ work_place: { choice: "home" } }, { locations: ["Springfield, IL"] }).score).toBe(rate().score);
    // JEV is unsure: the location line decides.
    expect(rate({ work_place: { choice: "unclear" } }, { locations: ["Springfield, IL"] }).reasons).toContain("near Springfield, IL");
    expect(rate({ work_place: { choice: "unclear" } }, { locations: ["Austin, TX"] }).reasons).toContain("place of work not stated");
    expect(rate({ work_place: { choice: "unclear" } }, { locations: ["Austin, TX"] }).score).toBeLessThan(rate().score);
    // A candidate who does not want remote work.
    expect(rate({}, {}, false).skipReason).toMatch(/not remote/);
  });
  it("carries the weight of the parts it does not ask about", () => {
    const top = rate({ stack_match: { score: 4 }, experience_match: { score: 4 }, callback_likelihood: { score: 4 } }, { postedAt: "2026-10-02" });
    expect(top.score).toBe(1);
  });
});

describe("a portfolio box", () => {
  const box = (label: string) => ({ label, name: "", hint: "", selector: "" });
  it("asks for the portfolio and never the resume", () => {
    expect(fileBoxWants(box("Portfolio (PDF)"))).toBe("portfolio");
    expect(fileBoxWants(box("Work samples"))).toBe("portfolio");
    expect(fileBoxWants(box("Resume and portfolio"))).toBe("resume");
    expect(fileBoxWants(box("Portfolio, cover letter or other files"))).toBe("cover");
  });
});
