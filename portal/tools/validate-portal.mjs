import { access, readFile } from "node:fs/promises";
import path from "node:path";

const curriculumRoot = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const portalRoot = path.join(curriculumRoot, "portal");
const manifest = JSON.parse(await readFile(path.join(portalRoot, "data", "resources.json"), "utf8"));
const courseMap = JSON.parse(await readFile(path.join(portalRoot, "data", "course-map.json"), "utf8"));
const resourceMetadata = JSON.parse(await readFile(path.join(portalRoot, "data", "resource-metadata.json"), "utf8"));
const appSource = await readFile(path.join(portalRoot, "js", "app.js"), "utf8");
const errors = [];

function fail(message) {
  errors.push(message);
}

function sortedNumbers(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function sortedDeckLabels(values) {
  return [...new Set(values)].sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")));
}

const byPath = new Map(manifest.resources.map((item) => [item.path, item]));
for (const resourcePath of Object.keys(resourceMetadata.resources || {})) {
  if (!byPath.has(resourcePath)) fail(`Resource metadata points to a missing manifest path: ${resourcePath}`);
}
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
if (!courseMap.curatedResources.districtApprovalAddendum) {
  fail("District Approval and Escalation Addendum is missing from curated resources.");
}
if (!courseMap.curatedResources.parentPack || !courseMap.curatedResources.initialFamilyCommunication) {
  fail("Family communication sources are missing from curated resources.");
}
if (courseMap.weeks.length !== 34) fail(`Expected 34 mapped weeks; found ${courseMap.weeks.length}.`);

const expectedShowcaseMilestoneWeeks = [21, 24, 27, 30, 31, 32, 33, 34];
const actualShowcaseMilestoneWeeks = (courseMap.showcaseMilestones || []).map((item) => item.week);
if (JSON.stringify(actualShowcaseMilestoneWeeks) !== JSON.stringify(expectedShowcaseMilestoneWeeks)) {
  fail("Showcase milestones do not match the authoritative Week 21-34 planning sequence.");
}
for (const week of [21, 24, 27]) {
  const milestone = (courseMap.showcaseMilestones || []).find((item) => item.week === week);
  if (!milestone?.teacherOnly || !milestone?.noStudentDeliverable) {
    fail(`Week ${week} showcase milestone must remain teacher-only with no added student deliverable.`);
  }
  const mapping = courseMap.weeks.find((item) => item.week === week);
  if (!mapping?.note.includes("Teacher-only showcase milestone")) {
    fail(`Week ${week} course note must identify the advance showcase milestone as teacher-only.`);
  }
  if (!mapping?.note.toLowerCase().includes("no added student") || !mapping?.note.toLowerCase().includes("print requirement")) {
    fail(`Week ${week} course note must state that the showcase milestone adds no student deliverable or print requirement.`);
  }
}
const publicShowcaseMilestone = (courseMap.showcaseMilestones || []).find((item) => item.week === 33);
if (!publicShowcaseMilestone?.action.includes("genuine public audience")) {
  fail("Week 33 showcase milestone must require a genuine public audience.");
}
if (appSource.includes("six to eight weeks ahead")) {
  fail("Portal still contains the outdated Week 21 showcase lead-time language.");
}

for (const item of manifest.resources) {
  if (!item.whenUsed) fail(`Resource is missing whenUsed metadata: ${item.path}`);
  if (!item.requirementStatus) fail(`Resource is missing requirementStatus metadata: ${item.path}`);
  if (!Array.isArray(item.audiences) || !item.audiences.length) fail(`Resource is missing audience metadata: ${item.path}`);
  if (!Array.isArray(item.units) || !item.units.length) fail(`Resource is missing unit relationship metadata: ${item.path}`);
  if (!Array.isArray(item.relatedDecks)) fail(`Resource is missing relatedDecks metadata: ${item.path}`);
}

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

const expectedUsageByRef = new Map();
for (const week of courseMap.weeks) {
  for (const [role, references] of [["required", week.required], ["optional", week.optional]]) {
    for (const ref of references) {
      const expected = expectedUsageByRef.get(ref) || {
        requiredWeeks: [],
        optionalWeeks: [],
        units: [],
        primaryDecks: [],
        revisitDecks: []
      };
      expected[`${role}Weeks`].push(week.week);
      expected.units.push(week.unit);
      expected.primaryDecks.push(...week.primaryDecks.map((deck) => `Deck ${deck}`));
      expected.revisitDecks.push(...week.secondaryDecks.map((deck) => `Deck ${deck}`));
      expectedUsageByRef.set(ref, expected);
    }
  }
}

for (const [ref, expected] of expectedUsageByRef) {
  const item = byRef.get(ref);
  if (!item) continue;
  const requiredWeeks = sortedNumbers(expected.requiredWeeks);
  const optionalWeeks = sortedNumbers(expected.optionalWeeks);
  const primaryDecks = sortedDeckLabels(expected.primaryDecks);
  const revisitDecks = sortedDeckLabels(expected.revisitDecks);
  const relatedDecks = sortedDeckLabels([...primaryDecks, ...revisitDecks]);
  const expectedRequired = requiredWeeks.length > 0;
  if (JSON.stringify(item.weeksRequired) !== JSON.stringify(requiredWeeks)) fail(`${ref} has incorrect required-week metadata.`);
  if (JSON.stringify(item.weeksOptional) !== JSON.stringify(optionalWeeks)) fail(`${ref} has incorrect optional-week metadata.`);
  if (JSON.stringify(item.relatedPrimaryDecks) !== JSON.stringify(primaryDecks)) fail(`${ref} has incorrect primary-deck metadata.`);
  if (JSON.stringify(item.relatedRevisitDecks) !== JSON.stringify(revisitDecks)) fail(`${ref} has incorrect revisit-deck metadata.`);
  if (JSON.stringify(item.relatedDecks) !== JSON.stringify(relatedDecks)) fail(`${ref} has incorrect combined deck metadata.`);
  if (item.required !== expectedRequired) fail(`${ref} required/optional metadata does not match the implementation calendar.`);
  for (const unit of new Set(expected.units)) {
    if (!item.units.includes(unit)) fail(`${ref} is missing unit relationship ${unit}.`);
  }
}

for (let deckNumber = 1; deckNumber <= 19; deckNumber += 1) {
  const item = byRef.get(`D${deckNumber}`);
  if (!item) continue;
  const deck = manifest.decks.find((entry) => Number(entry.number) === deckNumber);
  const primaryWeeks = sortedNumbers(courseMap.weeks.filter((week) => week.primaryDecks.includes(deckNumber)).map((week) => week.week));
  const revisitWeeks = sortedNumbers(courseMap.weeks.filter((week) => week.secondaryDecks.includes(deckNumber)).map((week) => week.week));
  if (!deck) fail(`Deck ${deckNumber} is missing canonical metadata.`);
  if (deck && item.title !== `Deck ${deckNumber}: ${deck.title}`) fail(`Deck ${deckNumber} does not use its canonical display title.`);
  if (deck && item.fileName !== deck.fileName) fail(`Deck ${deckNumber} does not use its canonical file name.`);
  if (item.unit === "Coursewide") fail(`Deck ${deckNumber} must identify its primary unit.`);
  if (JSON.stringify(item.relatedDecks) !== JSON.stringify([`Deck ${deckNumber}`])) fail(`Deck ${deckNumber} has incorrect self-relationship metadata.`);
  if (JSON.stringify(item.primaryWeeks) !== JSON.stringify(primaryWeeks)) fail(`Deck ${deckNumber} has incorrect primary-week metadata.`);
  if (JSON.stringify(item.revisitWeeks) !== JSON.stringify(revisitWeeks)) fail(`Deck ${deckNumber} has incorrect revisit-week metadata.`);
  if (!item.whenUsed || !item.requirementStatus) fail(`Deck ${deckNumber} is missing use metadata.`);
}

const weeklyProgressTrackerPath = courseMap.curatedResources.weeklyProgressTracker;
const weeklyProgressTracker = byPath.get(weeklyProgressTrackerPath);
if (!weeklyProgressTracker) fail("The canonical STARLAB Weekly Progress Tracker is missing.");
if (weeklyProgressTracker?.fileName !== "STARLAB_Weekly_Progress_Tracker.xlsx") {
  fail("The STARLAB Weekly Progress Tracker still uses a file-copy suffix.");
}

for (const week of courseMap.weeks) {
  const teacherGuide = byRef.get(`U${week.unit.split(" ")[1]} TG W${week.week}`);
  if (!teacherGuide) continue;
  const expectedDecks = sortedDeckLabels([...week.primaryDecks, ...week.secondaryDecks].map((deck) => `Deck ${deck}`));
  if (teacherGuide.whenUsed !== `Week ${week.week}`) fail(`Week ${week.week} teacher guide has incorrect whenUsed metadata.`);
  if (JSON.stringify(teacherGuide.relatedDecks) !== JSON.stringify(expectedDecks)) fail(`Week ${week.week} teacher guide has incorrect deck relationships.`);
  if (!teacherGuide.required) fail(`Week ${week.week} teacher guide must be marked as a required planning resource.`);
}

const highVisibilityMappings = {
  1: { primaryDecks: [1, 3], secondaryDecks: [], required: ["U1 H1", "U1 H2", "U1 H3", "U1 H4", "U1 AppA", "U1 AppB", "U1 AppC"], optional: ["U1 AppI", "U1 AppJ", "U1 AppL"] },
  2: { primaryDecks: [2, 4], secondaryDecks: [], required: ["U1 H5", "U1 H6", "U1 H7", "U1 H8", "U1 AppD", "U1 AppE", "U1 AppF", "U1 AppG", "U1 AppH"], optional: ["U1 AppI", "U1 AppK"] },
  3: { primaryDecks: [5], secondaryDecks: [4], required: ["U2 H1", "U2 H2", "U2 H3", "U2 H4", "U2 H5", "U2 AppA", "U2 AppB", "U2 AppC", "U2 AppD"], optional: ["U2 AppK"] },
  4: { primaryDecks: [5], secondaryDecks: [3], required: ["U2 H6", "U2 H7", "U2 H8", "U2 H9", "U2 H10", "U2 H11", "U2 H12", "U2 H13", "U2 AppE", "U2 AppF", "U2 AppG", "U2 AppH"], optional: ["U2 AppI", "U2 AppJ", "U2 AppL"] },
  5: { primaryDecks: [6, 7], secondaryDecks: [], required: ["U3 H1", "U3 H2", "U3 H3", "U3 AppA", "U3 AppB", "U3 AppC"], optional: ["U3 AppV"] },
  6: { primaryDecks: [8], secondaryDecks: [], required: ["U3 H4", "U3 H5", "U3 AppD", "U3 AppE"], optional: [] },
  16: { primaryDecks: [], secondaryDecks: [9], required: ["U3 H18", "U3 H19"], optional: ["U3 AppS", "U3 AppT", "U3 AppU", "U3 AppV"] },
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
const districtApprovalAddendum = byPath.get(courseMap.curatedResources.districtApprovalAddendum);
if (districtApprovalAddendum) {
  if (districtApprovalAddendum.whenUsed !== "Before Unit 2; review annually and whenever district policy changes") {
    fail("District Approval and Escalation Addendum has incorrect whenUsed metadata.");
  }
  if (districtApprovalAddendum.requirementStatus !== "Required local setup before Unit 2" || !districtApprovalAddendum.required) {
    fail("District Approval and Escalation Addendum must be required local setup before Unit 2.");
  }
  if (JSON.stringify(districtApprovalAddendum.audiences) !== JSON.stringify(["Administrator", "Teacher"])) {
    fail("District Approval and Escalation Addendum has incorrect audience metadata.");
  }
  if (JSON.stringify(districtApprovalAddendum.relatedDecks) !== JSON.stringify(["Deck 3", "Deck 5", "Deck 6"])) {
    fail("District Approval and Escalation Addendum has incorrect deck relationships.");
  }
  if (!districtApprovalAddendum.purpose.includes("district-specific project reviewers")) {
    fail("District Approval and Escalation Addendum is missing its high-use purpose metadata.");
  }
  if (!districtApprovalAddendum.keywords.includes("interim procedure") || !districtApprovalAddendum.keywords.includes("reapproval")) {
    fail("District Approval and Escalation Addendum is missing searchable implementation keywords.");
  }
}
if (!appSource.includes("Local setup is required before Unit 2.")) {
  fail("Project Approval & Safety page is missing the local setup notice.");
}
if (!appSource.includes("Open the District Approval and Escalation Addendum")) {
  fail("Project Approval & Safety page is missing the addendum link.");
}
if (!appSource.includes("function familiesPage()") || !appSource.includes("For teacher distribution.")) {
  fail("Teacher-facing Family Communications hub is missing or does not state the distribution policy.");
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
