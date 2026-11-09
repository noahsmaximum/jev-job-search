# What the search is for

*The `search` section of `data/profile.json`.*

With no `search` section the tool looks for what it began with: software
internships and new-grad roles, ranked by term and graduation date. Add
the section to look for something else. Everything after the search
(filling, verifying, submitting, the records) is the same for any role.

## The fields

| Field | What it does |
|---|---|
| `role` | `software` or `design`. Chooses the title filter, the seed list of company boards and the wording of the rating questions. |
| `titles` | Titles you want, as plain phrases. A posting whose title holds one is always kept for rating, and JEV is told these are what you are looking for. |
| `excludeTitles` | Words or phrases that rule a title out, whatever else it says. |
| `levels` | Any of `internship`, `new_grad`, `mid`, `senior`, `lead`. A posting JEV is sure sits at another level is skipped. With only `internship` and `new_grad` the search is the student one, with its term and graduation questions. |
| `employment` | Any of `full_time`, `part_time`, `contract`, `internship`. Empty means any. A posting that plainly says another kind is skipped. |
| `minSalary` | A yearly figure. A posting whose stated pay tops out below it is skipped. One that states no pay is kept, with "pay not stated" among its reasons. |
| `location.home` | Places you would work on site or hybrid, as "City, State". |
| `location.radiusMiles` | How far from those places still counts. JEV judges this from the posting; it is not measured. |
| `location.elsewhere` | `skip` drops a role that is neither remote nor near home. `rank_lower` keeps it at a lower score. |
| `boards` | More company boards to poll: `{ "ats": "greenhouse", "slug": "acme", "company": "Acme" }`. `ats` is `greenhouse`, `lever` or `ashby`; the slug is the name in the board's address. |

`preferences.remote` set to `"no"` makes a remote role count as one away
from home.

## A design search

```json
"search": {
  "role": "design",
  "titles": ["Graphic Designer", "Visual Designer", "Brand Designer", "Motion Designer", "Motion Graphics Designer", "Multimedia Designer", "Digital Designer", "Web Designer"],
  "excludeTitles": ["Instructional", "Learning"],
  "levels": ["mid", "senior"],
  "employment": ["full_time"],
  "minSalary": 60000,
  "location": { "home": ["Springfield, IL"], "radiusMiles": 30, "elsewhere": "skip" }
},
"portfolio": { "path": "/Users/you/jev-job-search/documents/portfolio.pdf" }
```

`links.github` is optional. A form that asks for a website gets
`links.website`, then `links.portfolio`. A file box that asks for a
portfolio gets `portfolio.path` when it is set and is left for you when
it is not. It is never given the resume.

## Where design jobs come from

The GitHub lists hold software internships only, so a design search does
not read them. It reads:

- the design seed boards in `src/sources/companies.ts` (agencies, studios
  and in-house brand teams on Greenhouse, Lever and Ashby), taking the
  postings whose title names design work
- the boards you add under `search.boards`
- any CSV in `data/imports/` with Company and Job Link columns
- `/apply <url>` for one posting you found yourself

The seed list is a start. Most of what it finds will come from the
boards you add for the companies you care about. Aggregators such as
Indeed and LinkedIn are not read: export what you find there to a CSV.

## What changes in the rating

The student questions (`term`, `graduation_excluded`,
`returning_student_required`) and `interview_practical` are not asked,
and the rest of the score carries their weight. `is_software_role`
becomes `is_target_role`, `stack_match` asks about tools and kinds of
work, and `level` has six choices. `employment_type`, `pay_stated`,
`pay_below_floor` and `work_place` are asked when the matching field is
set. Place is ranked by `PLACE_MULTIPLIER` in `src/config.ts`.

Changing the `search` section changes the questions, so postings rated
before the change are rated again on the next `discover`.

## Adding a kind of work

Add an entry to `ROLES` in `src/jobs/target.ts` (a title filter, the
role question, a seed list of boards) and its name to `role` in
`src/profile/schema.ts`.
