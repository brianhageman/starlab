import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const curriculumRoot = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const portalRoot = path.join(curriculumRoot, "portal");
const outputFile = path.join(portalRoot, "data", "resources.json");
const metadataFile = path.join(portalRoot, "data", "resource-metadata.json");
const courseMapFile = path.join(portalRoot, "data", "course-map.json");
const unitOrder = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"];

const unitMeta = {
  "Unit 1": {
    title: "Introduction to Scientific Research and Experimental Design",
    weeks: "Weeks 1-2",
    focus: "Research culture, scientific inquiry, ethics, experimental design, topic brainstorming, and preliminary research questions.",
    products: ["Course launch reflection", "Ethics agreement", "Research interest inventory", "Preliminary project pitch"],
    workflow: "Open the start-here guide, launch Decks 1-2, print Unit 1 handouts, and conference with students on early research questions."
  },
  "Unit 2": {
    title: "Project Planning and Hypothesis Development",
    weeks: "Weeks 3-4",
    focus: "Refining project ideas, background research, hypotheses or design criteria, procedures, data plans, safety, ethics, and approval.",
    products: ["Formal research plan", "Safety and risk assessment", "Ethics screening", "Project approval conference form"],
    workflow: "Use the project approval system, Decks 3-5, and Unit 2 planning handouts before students begin pilot testing."
  },
  "Unit 3": {
    title: "Pilot Testing and Data Collection",
    weeks: "Weeks 5-16",
    focus: "Pilot testing, research journals, revised procedures, systematic data collection, troubleshooting, mentor feedback, and progress reporting.",
    products: ["Research journal", "Revised procedure", "Progress report", "Data collection records"],
    workflow: "Move week by week through pilot testing, quality checks, mentor feedback, and readiness for analysis."
  },
  "Unit 4": {
    title: "Data Analysis and Interpretation",
    weeks: "Weeks 17-20",
    focus: "Raw versus clean data, analysis method selection, graphing, uncertainty, limitations, claim-evidence-reasoning, and readiness for reporting.",
    products: ["Clean data set", "Data analysis plan", "Graphs and captions", "Analysis summary"],
    workflow: "Audit data first, select analysis methods, build visuals, and prepare interpretation notes for reports."
  },
  "Unit 5": {
    title: "Scientific Reporting and Presentation Preparation",
    weeks: "Weeks 21-28",
    focus: "Scientific report structure, introduction, methods, results, discussion, conclusion, peer review, visual aids, and presentation preparation.",
    products: ["Full research report", "Peer review notes", "Revision plan", "Presentation plan"],
    workflow: "Draft the report section by section, run peer review, then shift students into presentation design."
  },
  "Unit 6": {
    title: "Project Presentation and Reflection",
    weeks: "Weeks 29-34",
    focus: "Final presentation readiness, Q&A, showcase preparation, public presentation, reflection, portfolio, and next steps.",
    products: ["Final presentation", "Portfolio", "Audience feedback", "Course reflection"],
    workflow: "Prepare students for final defense, public showcase expectations, audience Q&A, and post-course reflection."
  }
};

const deckMeta = [
  ["01", "Authentic Research and Course Launch", "Unit 1", "Launch the course and establish research culture."],
  ["02", "From Topic to Research Question", "Unit 1", "Help students turn interests into testable questions."],
  ["03", "Research Ethics, Safety, and Integrity", "Unit 2", "Frame ethics, safety, and responsible project choices."],
  ["04", "Experimental Design and Engineering Design Basics", "Unit 2", "Teach variables, controls, criteria, constraints, and design logic."],
  ["05", "Building a Formal Research Plan", "Unit 2", "Guide students into a complete plan for approval."],
  ["06", "Pilot Testing - Test Small First", "Unit 3", "Introduce small-scale testing before full data collection."],
  ["07", "Research Journals and Scientific Documentation", "Unit 3", "Set expectations for documentation and evidence trails."],
  ["08", "Troubleshooting and Responsible Project Pivots", "Unit 3", "Support iteration, problem solving, and justified pivots."],
  ["09", "Data Organization: Raw Data vs. Clean Data", "Unit 4", "Move students from collected data to analyzable data."],
  ["10", "Choosing the Right Data Analysis Method", "Unit 4", "Match research questions and data types to analysis methods."],
  ["11", "Graphing and Visual Ethics", "Unit 4", "Create honest, useful graphs and tables."],
  ["12", "Error, Uncertainty, and Limitations", "Unit 4", "Interpret uncertainty without overclaiming."],
  ["13", "Scientific Report Structure", "Unit 5", "Introduce the full research report architecture."],
  ["14", "Writing the Discussion: Claim, Evidence, Reasoning", "Unit 5", "Build rigorous discussion and interpretation writing."],
  ["15", "Peer Review and Scientific Revision", "Unit 5", "Support useful critique and revision."],
  ["16", "Designing a Research Poster or Presentation Board", "Unit 5", "Prepare visual communication products."],
  ["17", "Oral Presentation Skills for Research", "Unit 5", "Develop formal scientific speaking skills."],
  ["18", "Answering Questions Like a Scientist", "Unit 6", "Prepare students for Q&A and evidence defense."],
  ["19", "Final Reflection and Research Portfolio", "Unit 6", "Close the course with portfolio and reflection."]
].map(([number, title, unit, teachingMoment]) => ({ number, title, unit, teachingMoment }));

const studentFacingAppendixRefs = new Set([
  "U1 AppA", "U1 AppB", "U1 AppC", "U1 AppD", "U1 AppE", "U1 AppF", "U1 AppG", "U1 AppI",
  "U2 AppA", "U2 AppB", "U2 AppC", "U2 AppD", "U2 AppG", "U2 AppI", "U2 AppJ",
  "U3 AppA", "U3 AppB", "U3 AppC", "U3 AppD", "U3 AppE", "U3 AppF", "U3 AppG", "U3 AppH",
  "U3 AppJ", "U3 AppK", "U3 AppL", "U3 AppM", "U3 AppQ", "U3 AppR",
  "U4 AppA", "U4 AppB", "U4 AppC", "U4 AppD", "U4 AppE", "U4 AppF", "U4 AppG", "U4 AppH",
  "U4 AppI", "U4 AppJ", "U4 AppK", "U4 AppL", "U4 AppM",
  "U5 AppA", "U5 AppB", "U5 AppC", "U5 AppD", "U5 AppE", "U5 AppF", "U5 AppG", "U5 AppH",
  "U5 AppI", "U5 AppJ", "U5 AppK", "U5 AppL", "U5 AppM", "U5 AppO", "U5 AppQ",
  "U6 AppA", "U6 AppB", "U6 AppC", "U6 AppD", "U6 AppE", "U6 AppF", "U6 AppG", "U6 AppH",
  "U6 AppO", "U6 AppP", "U6 AppQ"
]);

const catalogAudienceOverrides = {
  "U1 AppJ": ["Parent/Guardian"],
  "U2 AppI": ["Student", "Mentor/Partner"],
  "U3 AppL": ["Student", "Mentor/Partner"],
  "U6 AppK": ["Visitor"]
};

const curatedUsage = {
  startHereGuide: {
    whenUsed: "Before course launch; ongoing reference",
    units: unitOrder,
    requirementStatus: "Required before launch"
  },
  courseProposal: {
    whenUsed: "District adoption and course setup",
    audiences: ["Administrator", "Teacher"],
    requirementStatus: "Reference for adoption"
  },
  syllabus: {
    whenUsed: "Before course launch; Week 1; grading checkpoints",
    relatedDecks: [1],
    units: unitOrder,
    audiences: ["Administrator", "Teacher", "Student"],
    requirementStatus: "Required before launch"
  },
  courseOperations: {
    whenUsed: "Before course launch; ongoing reference",
    units: unitOrder,
    requirementStatus: "Required before launch"
  },
  implementationCalendar: {
    whenUsed: "Before course launch; Weeks 1-34",
    relatedDecks: Array.from({ length: 19 }, (_, index) => index + 1),
    units: unitOrder,
    requirementStatus: "Required planning tool"
  },
  masterPrintIndex: {
    whenUsed: "Before each assigned week or deck",
    relatedDecks: Array.from({ length: 19 }, (_, index) => index + 1),
    units: unitOrder,
    requirementStatus: "Required planning tool"
  },
  gradingGuide: {
    whenUsed: "Before course launch; major assessment checkpoints",
    units: unitOrder,
    requirementStatus: "Required grading reference"
  },
  researchJournalRubric: {
    units: ["Unit 3", "Unit 4", "Unit 5", "Unit 6"],
    audiences: ["Teacher", "Student"],
    requirementStatus: "Authoritative scoring tool; printing optional"
  },
  analysisRubric: {
    units: ["Unit 3", "Unit 4"],
    audiences: ["Teacher", "Student"]
  },
  peerReviewQualityRubric: {
    units: ["Unit 5"],
    audiences: ["Teacher", "Student"],
    requirementStatus: "Optional local scoring tool; printing optional"
  },
  mentorToolkit: {
    whenUsed: "Weeks 3-16; Weeks 28-33 as needed",
    relatedDecks: [5, 7, 8, 17, 18],
    units: ["Unit 2", "Unit 3", "Unit 5", "Unit 6"],
    audiences: ["Teacher", "Mentor/Partner"],
    requirementStatus: "Optional / As needed"
  },
  approvalSystem: {
    whenUsed: "Weeks 3-5; before any testing or data collection",
    relatedDecks: [3, 5, 6],
    units: ["Unit 2", "Unit 3"],
    requirementStatus: "Required approval reference"
  },
  districtApprovalAddendum: {
    whenUsed: "Before Unit 2; review annually and whenever district policy changes",
    relatedDecks: [3, 5, 6],
    units: ["Unit 2", "Unit 3"],
    audiences: ["Administrator", "Teacher"],
    requirementStatus: "Required local setup before Unit 2",
    purpose: "Records district-specific project reviewers, escalation pathways, interim written-evidence rules, secure record storage, stop-work contacts, and local forms as they become available.",
    teacherUse: "Complete with administrators before Unit 2, then use it to route projects that need safety, ethics, mentor, privacy, fieldwork, equipment, or external review.",
    keywords: ["district approval", "escalation", "interim procedure", "written evidence", "local forms", "stop work", "reapproval"]
  },
  approvalTracker: {
    whenUsed: "Weeks 3-5; update before any testing or data collection",
    relatedDecks: [3, 5, 6],
    units: ["Unit 2", "Unit 3"],
    requirementStatus: "Required official record"
  },
  projectScheduleGuide: {
    whenUsed: "Weeks 3-16",
    relatedDecks: [5, 6, 7, 8],
    units: ["Unit 2", "Unit 3"],
    audiences: ["Student", "Teacher"],
    requirementStatus: "Optional planning support"
  },
  weeklyProgressStudentGuide: {
    whenUsed: "Weeks 5-16",
    relatedDecks: [7, 8, 9],
    units: ["Unit 3"],
    audiences: ["Student", "Teacher"],
    requirementStatus: "Optional student support"
  },
  weeklyProgressTracker: {
    whenUsed: "Weeks 5-16",
    relatedDecks: [7, 8, 9],
    units: ["Unit 3"],
    requirementStatus: "Required progress-monitoring tool"
  },
  parentPack: {
    whenUsed: "Before or Week 1; Weeks 3-4, 5-16, 21-28, 29-34; after showcase",
    units: unitOrder,
    audiences: ["Teacher", "Parent/Guardian"],
    requirementStatus: "Teacher-distributed communication source; adapt locally"
  },
  initialFamilyCommunication: {
    whenUsed: "Before or Week 1",
    relatedDecks: [1, 3],
    units: ["Unit 1"],
    audiences: ["Teacher", "Parent/Guardian"],
    requirementStatus: "Optional / Teacher distributed",
    useCategory: "teacher-distribution",
    printClassification: "teacher-distribution"
  },
  studentOnboarding: {
    whenUsed: "Week 1",
    relatedDecks: [1, 3],
    units: ["Unit 1"],
    audiences: ["Student", "Teacher"],
    requirementStatus: "Required at course launch"
  },
  sampleLibrary: {
    whenUsed: "Weeks 1-4 as needed",
    relatedDecks: [1, 2, 4, 5],
    units: ["Unit 1", "Unit 2"],
    audiences: ["Teacher", "Student"],
    requirementStatus: "Optional / As needed"
  },
  commonProblems: {
    whenUsed: "Weeks 5-34 as needed",
    relatedDecks: [6, 8, 9, 10, 12, 13, 17, 18],
    units: ["Unit 3", "Unit 4", "Unit 5", "Unit 6"],
    requirementStatus: "Optional / As needed"
  },
  aiPolicy: {
    whenUsed: "Week 1; ongoing reference",
    relatedDecks: [3],
    units: unitOrder,
    audiences: ["Student", "Teacher"],
    requirementStatus: "Required course policy"
  },
  safetyScopeGuide: {
    whenUsed: "Weeks 3-5; before any testing or data collection",
    relatedDecks: [3, 5, 6],
    units: ["Unit 2", "Unit 3"],
    requirementStatus: "Required approval reference"
  },
  showcasePlanningKit: {
    whenUsed: "Weeks 21-34",
    relatedDecks: [16, 17, 18, 19],
    units: ["Unit 5", "Unit 6"],
    requirementStatus: "Recommended teacher planning resource"
  }
};

const extensionType = {
  ".docx": "Document",
  ".pdf": "PDF",
  ".pptx": "Slide Deck",
  ".xlsx": "Tracker",
  ".txt": "Index",
  ".md": "Index",
  ".mp4": "Video",
  ".png": "Brand Asset"
};

function cleanTitle(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bQandA\b/g, "Q&A")
    .trim();
}

function inferUnit(parts, name) {
  const joined = `${parts.join(" ")} ${name}`;
  const match = joined.match(/Unit[\s_]*(\d)/i);
  return match ? `Unit ${match[1]}` : "Coursewide";
}

function inferType(parts, ext, title) {
  const folder = parts.join(" ").toLowerCase().replace(/[_-]+/g, " ");
  const lowered = title.toLowerCase();
  if (ext === ".pptx") return "Slide Deck";
  if (folder.includes("student handout")) return "Student Handout";
  if (folder.includes("teaching guide")) return "Teacher Guide";
  if (folder.includes("appendix")) return lowered.includes("rubric") ? "Rubric" : "Appendix";
  if (ext === ".xlsx") return "Tracker";
  if (lowered.includes("rubric")) return "Rubric";
  if (lowered.includes("approval") || lowered.includes("safety") || lowered.includes("risk") || lowered.includes("ethics")) return "Safety/Approval Resource";
  if (lowered.includes("mentor") || lowered.includes("partner") || lowered.includes("parent") || lowered.includes("guardian")) return "Communication Template";
  if (lowered.includes("showcase") || lowered.includes("presentation")) return "Showcase Resource";
  if (folder.includes("teacher resources")) return "Teacher Resource";
  return extensionType[ext] || "Resource";
}

function inferAudiences(type, title, catalogRef) {
  if (catalogAudienceOverrides[catalogRef]) return catalogAudienceOverrides[catalogRef];
  if (studentFacingAppendixRefs.has(catalogRef)) return ["Student"];
  const lowered = title.toLowerCase();
  if (type === "Student Handout") return ["Student"];
  if (type === "Rubric") return ["Teacher", "Student"];
  if (type === "Slide Deck") return ["Teacher", "Student"];
  if (lowered.includes("parent") || lowered.includes("guardian")) return ["Parent/Guardian"];
  if (lowered.includes("mentor") || lowered.includes("partner")) return ["Mentor/Partner"];
  if (lowered.includes("proposal") || lowered.includes("syllabus")) return ["Administrator", "Teacher"];
  if (lowered.includes("visitor")) return ["Visitor"];
  return ["Teacher"];
}

function inferWeek(title) {
  const week = title.match(/Week\s*[_ -]?(\d+)/i);
  if (week) return `Week ${week[1]}`;
  const unit2Week = title.match(/Week\s+(\d+)/i);
  return unit2Week ? `Week ${unit2Week[1]}` : "";
}

function inferDeck(title, ext) {
  if (ext !== ".pptx") return "";
  const deck = title.match(/^(\d{2})\b/);
  return deck ? `Deck ${Number(deck[1])}` : "";
}

function inferCatalogRef(unit, type, title, relatedDeck) {
  if (type === "Slide Deck" && relatedDeck) {
    return `D${Number(relatedDeck.replace(/\D/g, ""))}`;
  }
  if (!/^Unit \d$/.test(unit)) return "";
  const prefix = `U${unit.split(" ")[1]}`;
  if (type === "Teacher Guide") {
    const week = title.match(/Week\s*[_ -]?(\d+)/i);
    return week ? `${prefix} TG W${Number(week[1])}` : "";
  }
  if (type === "Student Handout") {
    const numbered = title.match(/(?:Student\s+Handout|Handout)\s*[_ -]?(\d+)/i)
      || title.match(/^(\d{1,2})\b/);
    return numbered ? `${prefix} H${Number(numbered[1])}` : "";
  }
  if (type === "Appendix" || type === "Rubric") {
    const appendix = title.match(/Appendix\s*[_ -]?([A-Z])\b/i);
    return appendix ? `${prefix} App${appendix[1].toUpperCase()}` : "";
  }
  return "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sortUnits(units) {
  return unique(units).sort((a, b) => {
    const aIndex = unitOrder.indexOf(a);
    const bIndex = unitOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function sortDeckLabels(decks) {
  return unique(decks).sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")));
}

function formatWeekRanges(weeks) {
  const ordered = unique(weeks).map(Number).sort((a, b) => a - b);
  if (!ordered.length) return "";
  const ranges = [];
  let start = ordered[0];
  let end = ordered[0];
  for (const week of ordered.slice(1)) {
    if (week === end + 1) {
      end = week;
      continue;
    }
    ranges.push([start, end]);
    start = week;
    end = week;
  }
  ranges.push([start, end]);
  return ranges.map(([first, last]) => first === last ? `Week ${first}` : `Weeks ${first}-${last}`).join(", ");
}

function defaultRequirementStatus(resource) {
  if (resource.required) return "Required";
  if (resource.useCategory === "teacher-reference") return "Optional / Teacher reference";
  if (resource.useCategory === "optional" || resource.useCategory === "support") return "Optional / As needed";
  if (resource.useCategory === "teacher-distribution") return "Optional / Teacher distributed";
  if (resource.useCategory === "administrator") return "Reference for adoption";
  return "Reference / As needed";
}

function mappedPrintClassification(resource, requiredWeeks, optionalWeeks) {
  const mixed = requiredWeeks.length && optionalWeeks.length;
  if (resource.type === "Student Handout") {
    if (!requiredWeeks.length) return "optional-student-copy";
    return mixed ? "required-at-primary-use-optional-elsewhere" : "required-student-copy";
  }
  if (resource.type === "Rubric") {
    if (!requiredWeeks.length) return "optional-practice-reference";
    return mixed ? "required-when-assessed-optional-practice-reference" : "required-when-assessed";
  }
  if (resource.type === "Appendix") {
    if (!requiredWeeks.length) return resource.audience === "Teacher" ? "optional-teacher-reference" : "optional-support";
    return mixed ? "required-at-primary-use-optional-reference" : "required-instructional-support";
  }
  return resource.printClassification;
}

function inferTags(title, type, unit, parts) {
  const source = `${title} ${type} ${unit} ${parts.join(" ")}`.toLowerCase();
  const candidates = [
    "approval", "analysis", "assessment", "calendar", "communication", "data", "ethics",
    "feedback", "graphing", "journal", "mentor", "portfolio", "presentation", "proposal",
    "reflection", "rubric", "safety", "showcase", "tracker", "troubleshooting", "writing"
  ];
  return candidates.filter((tag) => source.includes(tag));
}

function describe(resource) {
  const title = resource.title.toLowerCase();
  if (resource.type === "Slide Deck") {
    const deck = deckMeta.find((item) => `Deck ${Number(item.number)}` === resource.relatedDeck);
    return deck?.teachingMoment || "Presentation deck for classroom instruction.";
  }
  if (resource.type === "Teacher Guide") return "Teacher-facing lesson guidance, pacing, and implementation notes.";
  if (resource.type === "Student Handout") return "Student-facing activity, organizer, checklist, or planning document.";
  if (resource.type === "Appendix") return "Supplemental implementation, reference, or instructional support material.";
  if (resource.type === "Rubric") return "Assessment criteria or scoring guidance for a major STARLAB product.";
  if (resource.type === "Tracker") return "Spreadsheet tracker or planning tool for course implementation.";
  if (title.includes("start here")) return "First-stop guide for launching and orienting to STARLAB.";
  if (title.includes("calendar")) return "Course pacing and implementation timeline.";
  if (title.includes("syllabus")) return "Course overview and grading structure for stakeholders.";
  if (title.includes("video")) return "Promotional overview video for STARLAB.";
  return "STARLAB curriculum or implementation resource.";
}

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    if (entry.startsWith(".") || entry === "portal" || entry === "PD_Presentation" || entry === "STARLAB_Arduino_Smart_Assistant_Bootcamp" || entry === "index.html" || entry.startsWith("STARLAB_District_PD_")) continue;
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) {
      files.push(...await walk(full));
    } else {
      files.push({ full, info });
    }
  }
  return files;
}

const files = await walk(curriculumRoot);
const courseMap = JSON.parse(await readFile(courseMapFile, "utf8"));
let metadata = { resources: {} };
try {
  metadata = JSON.parse(await readFile(metadataFile, "utf8"));
} catch {
  metadata = { resources: {} };
}

const usageByCatalogRef = new Map();
const deckUsage = new Map(deckMeta.map((deck) => [Number(deck.number), { primaryWeeks: [], revisitWeeks: [], units: [] }]));
for (const week of courseMap.weeks) {
  for (const catalogRef of week.required) {
    const uses = usageByCatalogRef.get(catalogRef) || [];
    uses.push({ week: week.week, unit: week.unit, role: "required", primaryDecks: week.primaryDecks, secondaryDecks: week.secondaryDecks });
    usageByCatalogRef.set(catalogRef, uses);
  }
  for (const catalogRef of week.optional) {
    const uses = usageByCatalogRef.get(catalogRef) || [];
    uses.push({ week: week.week, unit: week.unit, role: "optional", primaryDecks: week.primaryDecks, secondaryDecks: week.secondaryDecks });
    usageByCatalogRef.set(catalogRef, uses);
  }
  for (const deckNumber of week.primaryDecks) {
    const use = deckUsage.get(deckNumber);
    use.primaryWeeks.push(week.week);
    use.units.push(week.unit);
  }
  for (const deckNumber of week.secondaryDecks) {
    const use = deckUsage.get(deckNumber);
    use.revisitWeeks.push(week.week);
    use.units.push(week.unit);
  }
}

const curatedUsageByPath = new Map(
  Object.entries(curatedUsage)
    .filter(([key]) => courseMap.curatedResources[key])
    .map(([key, value]) => [courseMap.curatedResources[key], value])
);

const resources = files.map(({ full, info }, index) => {
  const relativePath = path.relative(curriculumRoot, full);
  const webPath = `../${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`;
  const parts = relativePath.split(path.sep);
  const name = parts.at(-1);
  const ext = path.extname(name).toLowerCase();
  const title = cleanTitle(name);
  const unit = inferUnit(parts, title);
  const type = inferType(parts, ext, title);
  const relatedDeck = inferDeck(title, ext);
  const catalogRef = inferCatalogRef(unit, type, title, relatedDeck);
  const audiences = inferAudiences(type, title, catalogRef);
  const resource = {
    id: `res-${String(index + 1).padStart(3, "0")}`,
    title,
    fileName: name,
    unit,
    units: unit === "Coursewide" ? [] : [unit],
    type,
    audience: audiences[0],
    audiences,
    whenUsed: inferWeek(title),
    relatedDeck,
    relatedDecks: relatedDeck ? [relatedDeck] : [],
    relatedPrimaryDecks: [],
    relatedRevisitDecks: [],
    weeksRequired: [],
    weeksOptional: [],
    catalogRef,
    folder: parts.slice(0, -1).join(" / ") || "Root",
    path: relativePath,
    href: webPath,
    extension: ext.replace(".", "").toUpperCase() || "FILE",
    sizeBytes: info.size,
    sizeLabel: info.size > 1024 * 1024 ? `${(info.size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(info.size / 1024)} KB`,
    description: "",
    tags: []
  };
  resource.tags = inferTags(title, type, unit, parts);
  resource.description = describe(resource);
  const overrides = metadata.resources?.[relativePath] || {};
  if (overrides.titleOverride) resource.title = overrides.titleOverride;
  if (overrides.whenUsedOverride) resource.whenUsed = overrides.whenUsedOverride;
  if (overrides.relatedDeckOverride) {
    resource.relatedDeck = overrides.relatedDeckOverride;
    resource.relatedDecks = [overrides.relatedDeckOverride];
  }
  if (overrides.catalogRefOverride) {
    resource.catalogRef = overrides.catalogRefOverride;
    const revisedAudiences = inferAudiences(type, title, resource.catalogRef);
    resource.audience = revisedAudiences[0];
    resource.audiences = revisedAudiences;
  }
  if (overrides.audienceOverride && !studentFacingAppendixRefs.has(resource.catalogRef) && !catalogAudienceOverrides[resource.catalogRef]) {
    resource.audience = overrides.audienceOverride;
    resource.audiences = [overrides.audienceOverride];
  }
  resource.purpose = overrides.purpose || resource.description;
  resource.teacherUse = overrides.teacherUse || "";
  resource.studentUse = overrides.studentUse || "";
  resource.keywords = Array.isArray(overrides.keywords) ? overrides.keywords : [];
  resource.required = Boolean(overrides.required);
  resource.printRecommended = Boolean(overrides.printRecommended);
  resource.useCategory = overrides.useCategory || "";
  resource.printClassification = overrides.printClassification || "";
  resource.notes = overrides.notes || "";
  resource.requirementStatus = "";
  resource.usageNotes = "";
  return resource;
});

for (const resource of resources) {
  const mappedUses = usageByCatalogRef.get(resource.catalogRef) || [];
  if (mappedUses.length) {
    const requiredWeeks = unique(mappedUses.filter((use) => use.role === "required").map((use) => use.week)).sort((a, b) => a - b);
    const optionalWeeks = unique(mappedUses.filter((use) => use.role === "optional").map((use) => use.week)).sort((a, b) => a - b);
    const allWeeks = unique([...requiredWeeks, ...optionalWeeks]).sort((a, b) => a - b);
    const primaryDecks = sortDeckLabels(mappedUses.flatMap((use) => use.primaryDecks.map((deck) => `Deck ${deck}`)));
    const revisitDecks = sortDeckLabels(mappedUses.flatMap((use) => use.secondaryDecks.map((deck) => `Deck ${deck}`)));
    resource.units = sortUnits([resource.unit, ...mappedUses.map((use) => use.unit)]);
    resource.whenUsed = formatWeekRanges(allWeeks);
    resource.weeksRequired = requiredWeeks;
    resource.weeksOptional = optionalWeeks;
    resource.relatedPrimaryDecks = primaryDecks;
    resource.relatedRevisitDecks = revisitDecks;
    resource.relatedDecks = sortDeckLabels([...primaryDecks, ...revisitDecks]);
    resource.relatedDeck = resource.relatedDecks[0] || "";
    resource.required = requiredWeeks.length > 0;
    resource.requirementStatus = requiredWeeks.length && optionalWeeks.length
      ? `Required ${formatWeekRanges(requiredWeeks)}; optional/reference ${formatWeekRanges(optionalWeeks)}`
      : requiredWeeks.length
        ? "Required"
        : resource.audience === "Teacher"
          ? "Optional / Teacher reference"
          : "Optional";
    resource.usageNotes = [
      requiredWeeks.length ? `Required: ${formatWeekRanges(requiredWeeks)}` : "",
      optionalWeeks.length ? `Optional/reference: ${formatWeekRanges(optionalWeeks)}` : "",
      primaryDecks.length ? `Primary deck alignment: ${primaryDecks.join(", ")}` : "",
      revisitDecks.length ? `Revisit/reference deck alignment: ${revisitDecks.join(", ")}` : "",
      !primaryDecks.length && !revisitDecks.length ? "No new or revisited deck is assigned in the mapped week." : ""
    ].filter(Boolean).join(". ");
    resource.printRecommended = requiredWeeks.length > 0 && (
      resource.type === "Student Handout"
      || resource.type === "Rubric"
      || (resource.type === "Appendix" && resource.audience === "Student")
    );
    resource.printClassification = mappedPrintClassification(resource, requiredWeeks, optionalWeeks);
  }

  if (resource.type === "Teacher Guide") {
    const weeklyGuide = resource.catalogRef.match(/^U(\d) TG W(\d+)$/);
    if (weeklyGuide) {
      const week = courseMap.weeks.find((item) => item.week === Number(weeklyGuide[2]));
      if (week) {
        resource.units = [week.unit];
        resource.whenUsed = `Week ${week.week}`;
        resource.relatedPrimaryDecks = week.primaryDecks.map((deck) => `Deck ${deck}`);
        resource.relatedRevisitDecks = week.secondaryDecks.map((deck) => `Deck ${deck}`);
        resource.relatedDecks = sortDeckLabels([...resource.relatedPrimaryDecks, ...resource.relatedRevisitDecks]);
        resource.relatedDeck = resource.relatedDecks[0] || "";
        resource.required = true;
        resource.requirementStatus = "Required planning resource";
        resource.usageNotes = resource.relatedDecks.length
          ? `Teacher guide for Week ${week.week}; aligned to ${resource.relatedDecks.join(", ")}.`
          : `Teacher guide for Week ${week.week}; no new or revisited deck is assigned.`;
      }
    } else if (/^Unit \d$/.test(resource.unit)) {
      const unitWeeks = courseMap.weeks.filter((week) => week.unit === resource.unit);
      resource.units = [resource.unit];
      resource.whenUsed = `${unitMeta[resource.unit].weeks} planning`;
      resource.relatedPrimaryDecks = sortDeckLabels(unitWeeks.flatMap((week) => week.primaryDecks.map((deck) => `Deck ${deck}`)));
      resource.relatedRevisitDecks = sortDeckLabels(unitWeeks.flatMap((week) => week.secondaryDecks.map((deck) => `Deck ${deck}`)));
      resource.relatedDecks = sortDeckLabels([...resource.relatedPrimaryDecks, ...resource.relatedRevisitDecks]);
      resource.relatedDeck = resource.relatedDecks[0] || "";
      resource.required = true;
      resource.requirementStatus = "Required unit planning resource";
      resource.usageNotes = `Use before and during ${unitMeta[resource.unit].weeks}.`;
    }
  }

  if (resource.type === "Slide Deck") {
    const deckNumber = Number(resource.catalogRef.replace(/\D/g, ""));
    const deck = deckMeta.find((item) => Number(item.number) === deckNumber);
    const use = deckUsage.get(deckNumber);
    if (deck && use) {
      resource.unit = deck.unit;
      resource.units = unique([deck.unit, ...sortUnits(use.units)]);
      resource.relatedDeck = `Deck ${deckNumber}`;
      resource.relatedDecks = [resource.relatedDeck];
      resource.primaryWeeks = unique(use.primaryWeeks).sort((a, b) => a - b);
      resource.revisitWeeks = unique(use.revisitWeeks).sort((a, b) => a - b);
      resource.whenUsed = [
        resource.primaryWeeks.length ? `Primary: ${formatWeekRanges(resource.primaryWeeks)}` : "",
        resource.revisitWeeks.length ? `Revisit/reference: ${formatWeekRanges(resource.revisitWeeks)}` : ""
      ].filter(Boolean).join("; ");
      resource.required = true;
      resource.requirementStatus = "Required when assigned";
      resource.usageNotes = resource.whenUsed;
    }
  }

  const curated = curatedUsageByPath.get(resource.path);
  if (curated) {
    if (curated.whenUsed) resource.whenUsed = curated.whenUsed;
    if (curated.units) resource.units = sortUnits(curated.units);
    if (curated.relatedDecks) {
      resource.relatedDecks = sortDeckLabels(curated.relatedDecks.map((deck) => `Deck ${deck}`));
      resource.relatedDeck = resource.relatedDecks[0] || "";
    }
    if (curated.audiences) {
      resource.audiences = unique(curated.audiences);
      resource.audience = resource.audiences[0];
    }
    if (curated.requirementStatus) {
      resource.requirementStatus = curated.requirementStatus;
      resource.required = curated.requirementStatus.startsWith("Required");
    }
    if (curated.useCategory) resource.useCategory = curated.useCategory;
    if (curated.printClassification) resource.printClassification = curated.printClassification;
    if (curated.whenUsed) resource.usageNotes = curated.whenUsed;
    if (curated.purpose) {
      resource.purpose = curated.purpose;
      resource.description = curated.purpose;
    }
    if (curated.teacherUse) resource.teacherUse = curated.teacherUse;
    if (curated.keywords) resource.keywords = unique([...resource.keywords, ...curated.keywords]);
  }

  if (resource.path === "Teacher Resources (Start Here)/09_STARLAB_Project_Approval_System_Package/README.txt") {
    resource.whenUsed = "Weeks 3-5; approval system setup";
    resource.units = ["Unit 2", "Unit 3"];
    resource.relatedDecks = ["Deck 3", "Deck 5", "Deck 6"];
    resource.relatedDeck = resource.relatedDecks[0];
    resource.required = false;
    resource.requirementStatus = "Optional package reference";
    resource.usageNotes = "Use when setting up the project approval package.";
  } else if (resource.path.includes("STARLAB_Unit_2/Background Literature Review Examples/")) {
    resource.whenUsed = "Weeks 3-4 as needed";
    resource.units = ["Unit 2"];
    resource.relatedDecks = ["Deck 4", "Deck 5"];
    resource.relatedDeck = resource.relatedDecks[0];
    resource.audiences = ["Student", "Teacher"];
    resource.audience = resource.audiences[0];
    resource.required = false;
    resource.requirementStatus = "Optional example / reference";
    resource.usageNotes = "Use during background research and formal research-plan development as needed.";
  } else if (/^Unit \d$/.test(resource.unit) && /readme|folder index/i.test(resource.title)) {
    const unitWeeks = courseMap.weeks.filter((week) => week.unit === resource.unit);
    resource.whenUsed = `${unitMeta[resource.unit].weeks} reference`;
    resource.units = [resource.unit];
    resource.relatedDecks = sortDeckLabels(unitWeeks.flatMap((week) => [...week.primaryDecks, ...week.secondaryDecks].map((deck) => `Deck ${deck}`)));
    resource.relatedDeck = resource.relatedDecks[0] || "";
    resource.required = false;
    resource.requirementStatus = "Optional folder reference";
    resource.usageNotes = `Folder index for ${resource.unit}.`;
  } else if (resource.type === "Brand Asset") {
    resource.whenUsed = "Portal branding";
    resource.requirementStatus = "Portal asset";
    resource.usageNotes = "Used by the portal interface rather than a scheduled instructional week.";
  }

  resource.units = resource.units.length ? resource.units : resource.unit === "Coursewide" ? ["Coursewide"] : [resource.unit];
  resource.audiences = unique(resource.audiences.length ? resource.audiences : [resource.audience]);
  resource.audience = resource.audiences[0];
  resource.relatedDecks = sortDeckLabels(resource.relatedDecks);
  resource.relatedDeck = resource.relatedDecks[0] || resource.relatedDeck || "";
  resource.requirementStatus ||= defaultRequirementStatus(resource);
  resource.searchText = [
    resource.title,
    resource.description,
    resource.purpose,
    resource.teacherUse,
    resource.studentUse,
    resource.unit,
    resource.units.join(" "),
    resource.type,
    resource.audience,
    resource.audiences.join(" "),
    resource.whenUsed,
    resource.relatedDeck,
    resource.relatedDecks.join(" "),
    resource.relatedPrimaryDecks.join(" "),
    resource.relatedRevisitDecks.join(" "),
    resource.catalogRef,
    resource.folder,
    resource.tags.join(" "),
    resource.keywords.join(" "),
    resource.useCategory,
    resource.requirementStatus,
    resource.usageNotes
  ].join(" ");
}

resources.sort((a, b) => a.unit.localeCompare(b.unit, undefined, { numeric: true }) || a.type.localeCompare(b.type) || a.title.localeCompare(b.title, undefined, { numeric: true }));

const manifest = {
  generatedAt: new Date().toISOString(),
  program: {
    name: "STARLAB",
    fullName: "Science Through Advanced Research, Learning, Application, and Building",
    tagline: "Teacher-facing curriculum portal for launching, teaching, managing, assessing, and showcasing authentic student research.",
    logo: "../STARLAB%20Logo%202026.png",
    video: "https://www.youtube.com/embed/9OhlsMlZFdI"
  },
  units: unitMeta,
  decks: deckMeta,
  resources,
  summary: {
    totalResources: resources.length,
    byType: resources.reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + 1 }), {}),
    byUnit: resources.reduce((acc, item) => ({ ...acc, [item.unit]: (acc[item.unit] || 0) + 1 }), {})
  }
};

await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${resources.length} resources at ${path.relative(curriculumRoot, outputFile)}`);
