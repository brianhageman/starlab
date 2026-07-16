import { access, readFile } from "node:fs/promises";
import path from "node:path";

const curriculumRoot = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const portalRoot = path.join(curriculumRoot, "portal");
const manifest = JSON.parse(await readFile(path.join(portalRoot, "data", "resources.json"), "utf8"));
const courseMap = JSON.parse(await readFile(path.join(portalRoot, "data", "course-map.json"), "utf8"));
const appSource = await readFile(path.join(portalRoot, "js", "app.js"), "utf8");
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

for (const legacyConstant of ["weekFocus", "weekDecks", "weekHandoutPlan"]) {
  if (appSource.includes(`const ${legacyConstant}`)) {
    fail(`Portal app contains legacy duplicate mapping data: ${legacyConstant}.`);
  }
}

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

const highVisibilityMappings = {
  1: { primaryDecks: [1, 3], secondaryDecks: [], required: ["U1 H1", "U1 H2", "U1 H3", "U1 H4", "U1 AppA", "U1 AppB", "U1 AppC"], optional: ["U1 AppI", "U1 AppJ", "U1 AppL"] },
  2: { primaryDecks: [2, 4], secondaryDecks: [], required: ["U1 H5", "U1 H6", "U1 H7", "U1 H8", "U1 AppD", "U1 AppE", "U1 AppF", "U1 AppG", "U1 AppH"], optional: ["U1 AppI", "U1 AppK"] },
  3: { primaryDecks: [5], secondaryDecks: [4], required: ["U2 H1", "U2 H2", "U2 H3", "U2 H4", "U2 H5", "U2 AppA", "U2 AppB", "U2 AppC", "U2 AppD"], optional: ["U2 AppK"] },
  4: { primaryDecks: [5], secondaryDecks: [3], required: ["U2 H6", "U2 H7", "U2 H8", "U2 H9", "U2 H10", "U2 H11", "U2 H12", "U2 H13", "U2 AppE", "U2 AppF", "U2 AppG", "U2 AppH"], optional: ["U2 AppI", "U2 AppJ", "U2 AppL"] },
  5: { primaryDecks: [6, 7], secondaryDecks: [], required: ["U3 H1", "U3 H2", "U3 H3", "U3 AppA", "U3 AppB", "U3 AppC"], optional: [] },
  6: { primaryDecks: [8], secondaryDecks: [], required: ["U3 H4", "U3 H5", "U3 AppD", "U3 AppE"], optional: [] },
  16: { primaryDecks: [], secondaryDecks: [9], required: ["U3 H18", "U3 H19"], optional: ["U3 AppS", "U3 AppT", "U3 AppU"] },
  34: { primaryDecks: [19], secondaryDecks: [], required: ["U6 H15", "U6 H16", "U6 H18"], optional: ["U6 H17", "U6 AppO", "U6 AppP", "U6 AppQ", "U6 AppR", "U6 AppS"] }
};

const authoritativeDeckMappings = {
  1: [[1, 3], []],
  2: [[2, 4], []],
  3: [[5], [4]],
  4: [[5], [3]],
  5: [[6, 7], []],
  6: [[8], []],
  7: [[], [8]],
  8: [[], []],
  9: [[], [9]],
  10: [[], [8]],
  11: [[], []],
  12: [[], []],
  13: [[], [8]],
  14: [[], []],
  15: [[9], []],
  16: [[], [9]],
  17: [[9, 10], []],
  18: [[10], []],
  19: [[11, 12], []],
  20: [[], [12]],
  21: [[13], []],
  22: [[], [13]],
  23: [[], [13]],
  24: [[], [11]],
  25: [[14], []],
  26: [[], [13]],
  27: [[15], []],
  28: [[16], [17]],
  29: [[17], []],
  30: [[], [17]],
  31: [[18], []],
  32: [[], [16, 18]],
  33: [[], []],
  34: [[19], []]
};

for (const [week, [primaryDecks, secondaryDecks]] of Object.entries(authoritativeDeckMappings)) {
  const actual = courseMap.weeks.find((item) => item.week === Number(week));
  if (JSON.stringify(actual?.primaryDecks) !== JSON.stringify(primaryDecks)) {
    fail(`Week ${week} primary deck assignment no longer matches the implementation calendar.`);
  }
  if (JSON.stringify(actual?.secondaryDecks) !== JSON.stringify(secondaryDecks)) {
    fail(`Week ${week} revisit/reference deck assignment no longer matches the implementation calendar.`);
  }
}

for (const [week, expected] of Object.entries(highVisibilityMappings)) {
  const actual = courseMap.weeks.find((item) => item.week === Number(week));
  for (const field of ["primaryDecks", "secondaryDecks", "required", "optional"]) {
    if (JSON.stringify(actual?.[field]) !== JSON.stringify(expected[field])) {
      fail(`Week ${week} ${field} no longer matches the implementation calendar.`);
    }
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
