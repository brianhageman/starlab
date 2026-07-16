import { access, readFile } from "node:fs/promises";
import path from "node:path";

const curriculumRoot = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const portalRoot = path.join(curriculumRoot, "portal");
const manifest = JSON.parse(await readFile(path.join(portalRoot, "data", "resources.json"), "utf8"));
const courseMap = JSON.parse(await readFile(path.join(portalRoot, "data", "course-map.json"), "utf8"));
const errors = [];

function fail(message) {
  errors.push(message);
}

const byPath = new Map(manifest.resources.map((item) => [item.path, item]));
const byRef = new Map();
for (const item of manifest.resources) {
  if (!item.catalogRef) continue;
  if (byRef.has(item.catalogRef)) fail(`Duplicate catalog reference: ${item.catalogRef}`);
  byRef.set(item.catalogRef, item);
}

if (manifest.resources.some((item) => item.path.includes("STARLAB_Arduino_Smart_Assistant_Bootcamp"))) {
  fail("Arduino bootcamp must remain outside the main portal manifest.");
}
if (manifest.resources.some((item) => item.path.includes("STARLAB_Unit_5/Appendixes/Appendix_P_Oral_Presentation_Rubric"))) {
  fail("Retired Unit 5 Appendix P is still present in the manifest.");
}
if (courseMap.weeks.length !== 34) fail(`Expected 34 mapped weeks; found ${courseMap.weeks.length}.`);

for (let week = 1; week <= 34; week += 1) {
  const mapping = courseMap.weeks.find((item) => item.week === week);
  if (!mapping) {
    fail(`Missing Week ${week} mapping.`);
    continue;
  }
  const expectedUnit = week <= 2 ? 1 : week <= 4 ? 2 : week <= 16 ? 3 : week <= 20 ? 4 : week <= 28 ? 5 : 6;
  if (mapping.unit !== `Unit ${expectedUnit}`) fail(`Week ${week} is assigned to ${mapping.unit}; expected Unit ${expectedUnit}.`);
  const teacherGuide = `U${expectedUnit} TG W${week}`;
  if (!byRef.has(teacherGuide)) fail(`Week ${week} teacher guide is missing (${teacherGuide}).`);
  const overlap = mapping.required.filter((ref) => mapping.optional.includes(ref));
  if (overlap.length) fail(`Week ${week} has resources in both required and optional lists: ${overlap.join(", ")}`);
  for (const ref of [...mapping.required, ...mapping.optional]) {
    if (!byRef.has(ref)) fail(`Week ${week} references missing resource ${ref}.`);
  }
  for (const deck of [...mapping.primaryDecks, ...mapping.secondaryDecks]) {
    if (!Number.isInteger(deck) || deck < 1 || deck > 19) fail(`Week ${week} has invalid deck number ${deck}.`);
    if (!byRef.has(`D${deck}`)) fail(`Week ${week} references missing deck D${deck}.`);
  }
}

for (const [key, resourcePath] of Object.entries(courseMap.curatedResources)) {
  if (!byPath.has(resourcePath)) fail(`Curated resource ${key} points to a missing manifest path: ${resourcePath}`);
}
for (const [key, resourcePath] of Object.entries(courseMap.authority)) {
  if (key.endsWith("Rubric")) {
    if (!byRef.has(resourcePath)) fail(`Authority ${key} points to missing catalog reference ${resourcePath}.`);
  } else if (!byPath.has(resourcePath)) {
    fail(`Authority ${key} points to a missing manifest path: ${resourcePath}`);
  }
}

for (const item of manifest.resources) {
  try {
    await access(path.join(curriculumRoot, item.path));
  } catch {
    fail(`Manifest path is not readable with exact case: ${item.path}`);
  }
}

if (errors.length) {
  console.error(`Portal validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Portal validation passed: ${manifest.resources.length} resources, 34 weeks, and 19 decks checked.`);
