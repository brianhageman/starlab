import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const curriculumRoot = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const portalRoot = path.join(curriculumRoot, "portal");
const outputFile = path.join(portalRoot, "data", "resources.json");
const metadataFile = path.join(portalRoot, "data", "resource-metadata.json");

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
  const folder = parts.join(" ").toLowerCase();
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

function inferAudience(type, title) {
  const lowered = title.toLowerCase();
  if (type === "Student Handout") return "Student";
  if (lowered.includes("parent") || lowered.includes("guardian")) return "Parent/Guardian";
  if (lowered.includes("mentor") || lowered.includes("partner")) return "Mentor/Partner";
  if (lowered.includes("proposal") || lowered.includes("syllabus")) return "Administrator";
  if (lowered.includes("visitor")) return "Visitor";
  return "Teacher";
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
    if (entry.startsWith(".") || entry === "portal" || entry === "PD_Presentation" || entry === "index.html" || entry.startsWith("STARLAB_District_PD_")) continue;
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
let metadata = { resources: {} };
try {
  metadata = JSON.parse(await readFile(metadataFile, "utf8"));
} catch {
  metadata = { resources: {} };
}

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
  const resource = {
    id: `res-${String(index + 1).padStart(3, "0")}`,
    title,
    fileName: name,
    unit,
    type,
    audience: inferAudience(type, title),
    whenUsed: inferWeek(title),
    relatedDeck,
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
  resource.purpose = overrides.purpose || resource.description;
  resource.teacherUse = overrides.teacherUse || "";
  resource.studentUse = overrides.studentUse || "";
  resource.keywords = Array.isArray(overrides.keywords) ? overrides.keywords : [];
  resource.required = Boolean(overrides.required);
  resource.printRecommended = Boolean(overrides.printRecommended);
  resource.useCategory = overrides.useCategory || "";
  resource.notes = overrides.notes || "";
  resource.searchText = [
    resource.title,
    resource.description,
    resource.purpose,
    resource.teacherUse,
    resource.studentUse,
    resource.unit,
    resource.type,
    resource.audience,
    resource.whenUsed,
    resource.relatedDeck,
    resource.folder,
    resource.tags.join(" "),
    resource.keywords.join(" "),
    resource.useCategory
  ].join(" ");
  return resource;
}).sort((a, b) => a.unit.localeCompare(b.unit, undefined, { numeric: true }) || a.type.localeCompare(b.type) || a.title.localeCompare(b.title, undefined, { numeric: true }));

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
