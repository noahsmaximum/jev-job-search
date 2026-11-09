/**
 * Company boards worth polling directly. Seeded from every Greenhouse,
 * Lever and Ashby URL the list sources mention (those companies are hiring
 * early-career now), plus a hand-kept list of boards that post Canadian and
 * remote early-career software roles. Polling the board catches postings the
 * lists have not picked up yet, which is where the freshest ones are.
 */
import { greenhouseSlug } from "./ats/greenhouse.js";
import { leverSlug } from "./ats/lever.js";
import { ashbySlug } from "./ats/ashby.js";
import type { Job } from "../jobs/normalize.js";

export type Board = { ats: "greenhouse" | "lever" | "ashby"; slug: string; company: string };

/** Boards polled on every discover run regardless of what the lists mention. */
export const SEED_BOARDS: Board[] = [
  { ats: "greenhouse", slug: "stripe", company: "Stripe" },
  { ats: "greenhouse", slug: "doordashcanada", company: "DoorDash" },
  { ats: "greenhouse", slug: "doordashusa", company: "DoorDash" },
  { ats: "greenhouse", slug: "databricks", company: "Databricks" },
  { ats: "greenhouse", slug: "figma", company: "Figma" },
  { ats: "greenhouse", slug: "notion", company: "Notion" },
  { ats: "greenhouse", slug: "cloudflare", company: "Cloudflare" },
  { ats: "greenhouse", slug: "coinbase", company: "Coinbase" },
  { ats: "greenhouse", slug: "lyft", company: "Lyft" },
  { ats: "greenhouse", slug: "roblox", company: "Roblox" },
  { ats: "greenhouse", slug: "samsara", company: "Samsara" },
  { ats: "greenhouse", slug: "anthropic", company: "Anthropic" },
  { ats: "greenhouse", slug: "hudsonrivertrading", company: "Hudson River Trading" },
  { ats: "greenhouse", slug: "affirm", company: "Affirm" },
  { ats: "greenhouse", slug: "faire", company: "Faire" },
  { ats: "greenhouse", slug: "duolingo", company: "Duolingo" },
  { ats: "greenhouse", slug: "shopify", company: "Shopify" },
  { ats: "greenhouse", slug: "hopper", company: "Hopper" },
  { ats: "greenhouse", slug: "clio", company: "Clio" },
  { ats: "greenhouse", slug: "benchsci", company: "BenchSci" },
  { ats: "greenhouse", slug: "ada", company: "Ada" },
  { ats: "greenhouse", slug: "pinterest", company: "Pinterest" },
  { ats: "greenhouse", slug: "reddit", company: "Reddit" },
  { ats: "greenhouse", slug: "dropbox", company: "Dropbox" },
  { ats: "greenhouse", slug: "asana", company: "Asana" },
  { ats: "greenhouse", slug: "twilio", company: "Twilio" },
  { ats: "greenhouse", slug: "datadog", company: "Datadog" },
  { ats: "greenhouse", slug: "mongodb", company: "MongoDB" },
  { ats: "greenhouse", slug: "elastic", company: "Elastic" },
  { ats: "greenhouse", slug: "gitlab", company: "GitLab" },
  { ats: "greenhouse", slug: "hashicorp", company: "HashiCorp" },
  { ats: "greenhouse", slug: "1password", company: "1Password" },
  { ats: "greenhouse", slug: "wealthsimple", company: "Wealthsimple" },
  { ats: "greenhouse", slug: "neo", company: "Neo Financial" },
  { ats: "greenhouse", slug: "instacart", company: "Instacart" },
  { ats: "greenhouse", slug: "airbnb", company: "Airbnb" },
  { ats: "lever", slug: "plaid", company: "Plaid" },
  { ats: "lever", slug: "mistral", company: "Mistral AI" },
  { ats: "lever", slug: "palantir", company: "Palantir" },
  { ats: "lever", slug: "kraken", company: "Kraken" },
  { ats: "lever", slug: "zoox", company: "Zoox" },
  { ats: "lever", slug: "ledn", company: "Ledn" },
  { ats: "ashby", slug: "cohere", company: "Cohere" },
  { ats: "ashby", slug: "wealthsimple", company: "Wealthsimple" },
  { ats: "ashby", slug: "1password", company: "1Password" },
  { ats: "ashby", slug: "zip", company: "Zip" },
  { ats: "ashby", slug: "elevenlabs", company: "ElevenLabs" },
  { ats: "ashby", slug: "replit", company: "Replit" },
  { ats: "ashby", slug: "ramp", company: "Ramp" },
  { ats: "ashby", slug: "linear", company: "Linear" },
  { ats: "ashby", slug: "vercel", company: "Vercel" },
  { ats: "ashby", slug: "supabase", company: "Supabase" },
  { ats: "ashby", slug: "openai", company: "OpenAI" },
  { ats: "ashby", slug: "perplexity", company: "Perplexity" },
  { ats: "ashby", slug: "cursor", company: "Cursor" },
  { ats: "ashby", slug: "deel", company: "Deel" },
  { ats: "ashby", slug: "mercury", company: "Mercury" },
  { ats: "ashby", slug: "float", company: "Float" },
  { ats: "ashby", slug: "shakudo", company: "Shakudo" },
  { ats: "ashby", slug: "superhuman", company: "Superhuman" },
  { ats: "ashby", slug: "Superhuman%20Platform%20Inc", company: "Superhuman" },
  // Companies with offices in Vancouver, or elsewhere in Western Canada, whose postings the lists often miss.
  { ats: "greenhouse", slug: "hootsuite", company: "Hootsuite" },
  { ats: "greenhouse", slug: "later", company: "Later" },
  { ats: "greenhouse", slug: "abcellera", company: "AbCellera" },
  { ats: "greenhouse", slug: "aspectbiosystems", company: "Aspect Biosystems" },
  { ats: "greenhouse", slug: "layerzerolabs", company: "LayerZero Labs" },
  { ats: "greenhouse", slug: "brex", company: "Brex" },
  { ats: "greenhouse", slug: "7shifts", company: "7shifts" },
  { ats: "lever", slug: "kabam", company: "Kabam" },
  { ats: "lever", slug: "apryse", company: "Apryse" },
  { ats: "lever", slug: "blackbirdinteractive", company: "Blackbird Interactive" },
  { ats: "ashby", slug: "klue", company: "Klue" },
  { ats: "ashby", slug: "trulioo", company: "Trulioo" },
  { ats: "ashby", slug: "spare", company: "Spare" },
  { ats: "ashby", slug: "neofinancial", company: "Neo Financial" },
  { ats: "ashby", slug: "jobber", company: "Jobber" },
  { ats: "ashby", slug: "lightspeedhq", company: "Lightspeed" },
];

/**
 * Boards polled when the search is for design work: agencies, studios and in-house brand teams
 * that had design openings on a public board when this list was made. Add your own under
 * `search.boards` in the profile.
 */
export const DESIGN_SEED_BOARDS: Board[] = [
  { ats: "greenhouse", slug: "monks", company: "Monks" },
  { ats: "greenhouse", slug: "landor", company: "Landor" },
  { ats: "greenhouse", slug: "ogilvy", company: "Ogilvy" },
  { ats: "greenhouse", slug: "vaynermedia", company: "VaynerMedia" },
  { ats: "greenhouse", slug: "akqa", company: "AKQA" },
  { ats: "greenhouse", slug: "rga", company: "R/GA" },
  { ats: "greenhouse", slug: "ideo", company: "IDEO" },
  { ats: "lever", slug: "instrument", company: "Instrument" },
  { ats: "lever", slug: "wpromote", company: "Wpromote" },
  { ats: "greenhouse", slug: "riotgames", company: "Riot Games" },
  { ats: "greenhouse", slug: "scopely", company: "Scopely" },
  { ats: "greenhouse", slug: "epicgames", company: "Epic Games" },
  { ats: "greenhouse", slug: "roblox", company: "Roblox" },
  { ats: "greenhouse", slug: "twitch", company: "Twitch" },
  { ats: "greenhouse", slug: "reddit", company: "Reddit" },
  { ats: "greenhouse", slug: "discord", company: "Discord" },
  { ats: "greenhouse", slug: "pinterest", company: "Pinterest" },
  { ats: "greenhouse", slug: "duolingo", company: "Duolingo" },
  { ats: "greenhouse", slug: "figma", company: "Figma" },
  { ats: "greenhouse", slug: "airbnb", company: "Airbnb" },
  { ats: "greenhouse", slug: "instacart", company: "Instacart" },
  { ats: "greenhouse", slug: "doordashusa", company: "DoorDash" },
  { ats: "greenhouse", slug: "voxmedia", company: "Vox Media" },
  { ats: "greenhouse", slug: "glossier", company: "Glossier" },
  { ats: "greenhouse", slug: "bombas", company: "Bombas" },
  { ats: "greenhouse", slug: "oura", company: "Oura" },
  { ats: "greenhouse", slug: "brex", company: "Brex" },
  { ats: "greenhouse", slug: "robinhood", company: "Robinhood" },
  { ats: "lever", slug: "spotify", company: "Spotify" },
  { ats: "ashby", slug: "whoop", company: "WHOOP" },
  { ats: "ashby", slug: "ramp", company: "Ramp" },
  { ats: "ashby", slug: "linear", company: "Linear" },
  { ats: "ashby", slug: "elevenlabs", company: "ElevenLabs" },
  { ats: "ashby", slug: "webflow", company: "Webflow" },
];

/** Every board the given jobs point at, merged with the seed list, deduped by ats+slug. */
export function boardsFromJobs(jobs: Job[], seeds: Board[] = SEED_BOARDS): Board[] {
  const map = new Map<string, Board>();
  for (const b of seeds) map.set(`${b.ats}:${b.slug.toLowerCase()}`, b);
  for (const j of jobs) {
    let b: Board | null = null;
    if (j.ats === "greenhouse") {
      const s = greenhouseSlug(j.url);
      if (s) b = { ats: "greenhouse", slug: s, company: j.company };
    } else if (j.ats === "lever") {
      const s = leverSlug(j.url);
      if (s) b = { ats: "lever", slug: s, company: j.company };
    } else if (j.ats === "ashby") {
      const s = ashbySlug(j.url);
      if (s) b = { ats: "ashby", slug: s, company: j.company };
    }
    if (b && !map.has(`${b.ats}:${b.slug.toLowerCase()}`)) map.set(`${b.ats}:${b.slug.toLowerCase()}`, b);
  }
  return [...map.values()];
}
