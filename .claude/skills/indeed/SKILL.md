---
name: indeed
description: Search Indeed for the roles in the profile and hand what it finds to the tool. Use when the user says /indeed, "search Indeed", or "find more jobs" on a search other than the student one. Needs the Indeed connector in Claude Code. Writes data/imports/indeed.leads.json, then looks each lead up on the company's own board.
model: claude-sonnet-5-5
effort: medium
---

# /indeed: leads from Indeed

The tool cannot apply on Indeed: that needs a sign-in, and it signs in
nowhere. So Indeed is used to find postings, and the tool then looks for
the same posting on the company's own board (Greenhouse, Lever, Ashby),
where it can read and fill the form. What it cannot find there is listed
for the person, with the Indeed link.

You do the searching, with the Indeed connector (`search_jobs`). If the
connector is not there, say so and stop: the person adds it under
Connectors in their Claude settings. Never open Indeed in a browser and
never sign in to it.

## Steps

1. Read `search` in `data/profile.json`. With no `search` section, ask
   what titles to look for; do not guess.
2. Search once per title in `search.titles`, for each place:
   - `location: "remote"`, unless `preferences.remote` is `"no"`
   - each entry of `search.location.home`
   Pass `job_type` when `search.employment` names one kind: `full_time`
   is `fulltime`, `part_time` is `parttime`, `contract` and `internship`
   as written. Keep to twenty searches a run, the first titles first.
3. Drop what the profile rules out before writing anything: a title that
   holds a phrase in `search.excludeTitles`, pay whose top is below
   `search.minSalary`, a posting older than 14 days, and a staffing
   agency that does not name the employer. Drop the same company and
   title seen twice.
4. Write `data/imports/indeed.leads.json`, replacing the old file: a JSON
   array, one object per posting, with only what the result says.

   ```json
   [
     {
       "company": "Acme",
       "title": "Brand Designer",
       "location": "Remote",
       "postedAt": "2026-10-01",
       "pay": "$70,000 - $85,000 a year",
       "link": "https://to.indeed.com/...",
       "source": "indeed"
     }
   ]
   ```

   `company` and `title` are required. Leave a field out when the result
   does not give it. The file is git-ignored; keep it that way.
5. Run:

   ```
   npx jev leads
   ```

   It looks each company up and prints two lists: the postings found on a
   company board, and the leads that are the person's to apply to.
6. Run `/discover`. The found postings are rated with everything else,
   and each company board found is polled from now on.
7. Show the person the leads left for them as a short table (company,
   title, place, pay, link), the best matches to their titles first. Those
   are applied to by hand, on Indeed or the company's site. If they find
   the company's own Greenhouse, Lever or Ashby link, `/apply <link>`
   takes it.

## What to expect

A company is found only when its board goes by its name and lists the
same title. Small studios and companies on other systems will not be.
A company with no board found is not looked up again for a week.
