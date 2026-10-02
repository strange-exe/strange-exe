const fs = require("fs");

const SOURCE = process.argv[2] || "https://abhinesh.codes/projects.json";
const README = "README.md";
const START = "<!-- PROJECTS:START -->";
const END = "<!-- PROJECTS:END -->";

const live = p => (p.demo_url && p.demo_status !== "down" ? p.demo_url : null);
const oneLine = s => String(s ?? "").replace(/\r?\n/g, " ").trim();

function featuredBlock(p) {
  const links = [`[GitHub Repository](${p.github_url})`];
  if (live(p)) links.push(`[Live Demo](${live(p)})`);
  return [
    `### ${p.emoji ? p.emoji + " " : ""}[${p.title}](${live(p) || p.github_url})`,
    `> ${oneLine(p.tagline || p.description || "")}`,
    p.stack?.length ? `* **Stack:** ${p.stack.join(", ")}` : null,
    p.impact ? `* **Impact:** ${oneLine(p.impact)}` : null,
    `* ${links.join(" • ")}`,
  ].filter(Boolean).join("\n");
}

function moreItem(p) {
  const desc = p.description ? `: ${oneLine(p.description)}` : "";
  const demo = live(p) ? ` [Demo](${live(p)})` : "";
  return `- **[${p.title}](${p.github_url})**${desc}${demo}`;
}

function render(projects) {
  const featured = projects
    .filter(p => p.featured)
    .sort((a, b) => (a.featured_order ?? 0) - (b.featured_order ?? 0)); // profile.json order
  const rest = projects
    .filter(p => !p.featured)
    .sort((a, b) => new Date(b.updated) - new Date(a.updated));

  return [
    "## Featured Projects",
    "",
    featured.map(featuredBlock).join("\n\n"),
    "",
    "<details>",
    "<summary>View More Projects</summary>",
    "",
    rest.map(moreItem).join("\n"),
    "</details>",
  ].join("\n");
}

async function load(source) {
  if (!/^https?:/.test(source)) return JSON.parse(fs.readFileSync(source, "utf8"));
  const res = await fetch(source, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const projects = await load(SOURCE);
  if (!Array.isArray(projects) || !projects.length) throw new Error("projects.json is empty");

  const readme = fs.readFileSync(README, "utf8");
  const s = readme.indexOf(START);
  const e = readme.indexOf(END);
  if (s === -1 || e === -1 || e < s) throw new Error(`README.md needs ${START} and ${END} markers`);

  const next = readme.slice(0, s + START.length) + "\n" + render(projects) + "\n" + readme.slice(e);
  if (next === readme) return console.log("README already up to date");
  fs.writeFileSync(README, next);
  console.log(`README updated: ${projects.filter(p => p.featured).length} featured, ${projects.filter(p => !p.featured).length} more`);
}

main().catch(err => {
  console.error("❌", err.message);
  process.exit(1);
});
