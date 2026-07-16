import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const curriculumRoot = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const manifestPath = path.join(curriculumRoot, "portal", "data", "resources.json");
const metadataPath = path.join(curriculumRoot, "portal", "data", "resource-metadata.json");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const existing = await readFile(metadataPath, "utf8").then((text) => JSON.parse(text)).catch(() => ({ resources: {} }));

function norm(value = "") {
  return String(value).toLowerCase();
}

function wordsFor(resource) {
  return norm(`${resource.title} ${resource.type} ${resource.unit} ${resource.folder} ${resource.tags?.join(" ")}`);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function classify(resource) {
  const text = wordsFor(resource);
  const titleText = norm(resource.title);
  const keywords = [...(resource.tags || []), resource.unit.toLowerCase(), resource.type.toLowerCase()];
  let required = false;
  let printRecommended = false;
  let useCategory = "reference";
  let purpose = resource.description || "STARLAB curriculum resource.";
  let teacherUse = "Use when this resource supports the current unit, week, or workflow.";
  let studentUse = "";
  let audienceOverride = "";
  let printClassification = "";

  if (resource.type === "Teacher Guide") {
    required = true;
    useCategory = "core";
    keywords.push("lesson planning", "weekly guide", "teacher prep", "pacing");
    purpose = "Teacher-facing weekly guidance for planning instruction, pacing, conferences, and implementation decisions.";
    teacherUse = "Open before teaching the associated week or unit.";
  }

  if (resource.type === "Slide Deck") {
    required = true;
    useCategory = "core";
    keywords.push("slides", "presentation", "direct instruction", "classroom teaching");
    purpose = "Instructional slide deck for introducing or reinforcing a major STARLAB research skill.";
    teacherUse = "Preview before class and use during direct instruction or guided discussion.";
  }

  if (resource.type === "Student Handout") {
    required = true;
    printRecommended = true;
    useCategory = "core";
    keywords.push("student-facing", "print", "handout", "student work");
    purpose = "Student-facing organizer, activity, checklist, or planning document for the research process.";
    teacherUse = "Print or share with students when the related unit or week is taught.";
    studentUse = "Complete during class, conferences, planning, data collection, analysis, reporting, or reflection.";
    printClassification = "required-student-copy";
  }

  if (resource.type === "Appendix") {
    printRecommended = text.includes("checklist") || text.includes("rubric") || text.includes("guide");
    useCategory = text.includes("optional") ? "optional" : "reference";
    keywords.push("appendix", "support", "reference");
    purpose = "Supplemental implementation, reference, or instructional support material.";
    teacherUse = "Use as needed when the weekly guide, unit page, or student project context calls for additional support.";
    printClassification = "optional-or-teacher-reference";
  }

  if (resource.type === "Rubric") {
    required = true;
    printRecommended = true;
    useCategory = "assessment";
    keywords.push("assessment", "rubric", "grading", "criteria", "feedback");
    purpose = "Assessment criteria or scoring guidance for a STARLAB product, checkpoint, report, or presentation.";
    teacherUse = "Use when scoring, conferencing, or giving feedback on the related student product.";
    studentUse = "Use to understand expectations before submitting or presenting work.";
    printClassification = "required-when-assessed";
  }

  if (resource.type === "Tracker") {
    required = true;
    useCategory = "operations";
    keywords.push("tracker", "spreadsheet", "operations", "monitoring", "management");
    purpose = "Spreadsheet or tracker for monitoring course implementation, approvals, progress, printing, or planning.";
    teacherUse = "Use as an operational dashboard or record-keeping tool.";
  }

  if (text.includes("approval")) {
    required = true;
    keywords.push("approval", "project approval", "teacher review", "status", "before testing");
    purpose = "Supports the project approval workflow before students begin pilot testing or data collection.";
    teacherUse = "Use before approving, pausing, redirecting, or escalating a student project.";
  }

  if (text.includes("safety") || text.includes("risk") || text.includes("ethics")) {
    required = true;
    keywords.push("safety", "risk", "ethics", "red flags", "screening");
    purpose = "Supports safety, risk, ethics, and feasibility decisions for student research.";
    teacherUse = "Use before students begin testing and whenever a project changes risk level.";
    studentUse ||= "Use to identify risks, ethical concerns, and approval needs before testing.";
  }

  if (text.includes("mentor") || text.includes("partner")) {
    useCategory = "support";
    keywords.push("mentor", "community partner", "expert feedback", "communication");
    purpose = "Supports mentor, expert, or community partner communication and feedback.";
    teacherUse = "Use when recruiting, preparing, guiding, or documenting mentor involvement.";
  }

  if (text.includes("showcase") || text.includes("visitor") || text.includes("audience")) {
    useCategory = "showcase";
    keywords.push("showcase", "visitor", "audience", "final presentation", "public presentation");
    purpose = "Supports final showcase planning, visitor experience, student readiness, or audience feedback.";
    teacherUse = "Use while preparing students, logistics, visitors, feedback, and final presentation expectations.";
  }

  if (text.includes("journal")) {
    keywords.push("research journal", "documentation", "evidence trail", "reflection");
    purpose = "Supports research journal expectations, documentation habits, or self-assessment.";
  }

  if (text.includes("data") || text.includes("graph") || text.includes("analysis") || text.includes("statistics")) {
    keywords.push("data", "analysis", "graphing", "statistics", "interpretation");
    purpose = "Supports data organization, analysis, graphing, interpretation, or uncertainty.";
  }

  if (text.includes("report") || text.includes("discussion") || text.includes("methods") || text.includes("introduction")) {
    keywords.push("scientific writing", "report", "drafting", "revision");
    purpose = "Supports scientific report planning, drafting, revision, or formatting.";
  }

  if (text.includes("presentation") || text.includes("q&a") || text.includes("oral")) {
    keywords.push("presentation", "oral communication", "q&a", "evidence defense");
    purpose = "Supports presentation design, practice, Q&A preparation, or evidence defense.";
  }

  if (text.includes("calendar") || text.includes("pacing")) {
    keywords.push("calendar", "pacing", "year plan", "implementation");
    purpose = "Supports course pacing and yearlong implementation planning.";
  }

  if (text.includes("print packet") || text.includes("print")) {
    keywords.push("print", "copies", "packet", "materials prep");
    printRecommended = true;
  }

  if (text.includes("optional")) {
    required = false;
    useCategory = "optional";
    keywords.push("optional", "extension");
  }

  if (text.includes("teacher checklist") || text.includes("differentiation and implementation")) {
    required = false;
    printRecommended = false;
    useCategory = "teacher-reference";
    printClassification = "optional-or-teacher-reference";
    keywords.push("teacher reference", "optional support", "implementation support");
    teacherUse = "Keep as an optional teacher reference; it is not a required student print material.";
  }

  if (text.includes("parent guardian communication pack")) {
    required = false;
    printRecommended = false;
    useCategory = "teacher-distribution";
    audienceOverride = "Teacher";
    printClassification = "teacher-distribution";
    keywords.push("teacher distribution", "family communication");
    teacherUse = "Customize and distribute to families through district-approved teacher communication channels.";
  }

  if (titleText.includes("start here")) {
    required = true;
    useCategory = "core";
    keywords.push("start here", "new teacher", "launch", "orientation", "first steps");
    purpose = "First-stop guide for understanding STARLAB and launching the course.";
    teacherUse = "Open first when preparing to teach or evaluate STARLAB.";
  }

  if (text.includes("operations manual")) {
    required = true;
    useCategory = "operations";
    keywords.push("operations manual", "course systems", "implementation", "teacher workflow");
    purpose = "Teacher operations guide for managing the course structure, routines, and implementation systems.";
    teacherUse = "Use during course setup and whenever implementation questions arise.";
  }

  if (text.includes("syllabus")) {
    required = true;
    useCategory = "core";
    keywords.push("syllabus", "grading weights", "course expectations", "student expectations");
    purpose = "Course syllabus describing expectations, grading categories, and course structure.";
    teacherUse = "Use when communicating course expectations to students, families, administrators, or counselors.";
  }

  if (text.includes("course proposal")) {
    useCategory = "administrator";
    keywords.push("course proposal", "administrator", "district", "program approval", "course rationale");
    purpose = "Program-facing course proposal for explaining STARLAB to administrators or stakeholders.";
    teacherUse = "Use when discussing course adoption, approval, or program expansion.";
  }

  if (text.includes("onboarding")) {
    required = true;
    printRecommended = true;
    keywords.push("onboarding", "student launch", "first week", "student orientation");
    purpose = "Student onboarding packet for introducing expectations, routines, and the STARLAB research process.";
    teacherUse = "Use at the beginning of the course or when orienting new students.";
    studentUse = "Use to understand course expectations and early research routines.";
  }

  if (text.includes("grading") || text.includes("assessment guide")) {
    required = true;
    useCategory = "assessment";
    keywords.push("grading", "assessment", "rubrics", "scoring", "evidence", "feedback");
    purpose = "Teacher guide for grading, assessment categories, evidence collection, and feedback in STARLAB.";
    teacherUse = "Use when planning grading practices, explaining assessment, or scoring major products.";
  }

  if (text.includes("common problems")) {
    useCategory = "support";
    keywords.push("common problems", "troubleshooting", "teacher support", "intervention");
    purpose = "Troubleshooting guide for common STARLAB implementation and student research problems.";
    teacherUse = "Use when students get stuck, projects drift, or classroom systems need adjustment.";
  }

  if (text.includes("ai use policy")) {
    required = true;
    useCategory = "policy";
    keywords.push("ai", "ai policy", "academic integrity", "student use", "guidelines");
    purpose = "Policy guidance for appropriate AI use in STARLAB research, writing, and documentation.";
    teacherUse = "Use when setting expectations for student AI use and academic integrity.";
  }

  if (text.includes("sample student project")) {
    useCategory = "reference";
    keywords.push("sample projects", "examples", "student project ideas", "model projects");
    purpose = "Reference library of sample student projects for inspiration, calibration, and feasibility conversations.";
    teacherUse = "Use to help students understand possible project directions and appropriate scope.";
  }

  return {
    titleOverride: "",
    purpose,
    teacherUse,
    studentUse,
    keywords: unique(keywords),
    required,
    printRecommended,
    useCategory,
    audienceOverride,
    printClassification,
    notes: ""
  };
}

const metadata = {
  generatedAt: new Date().toISOString(),
  description: "Curated metadata overrides merged into portal/data/resources.json by portal/tools/generate-manifest.mjs. Edit entries here to improve teacher search and resource guidance.",
  resources: {}
};

for (const resource of manifest.resources) {
  const generated = classify(resource);
  const prior = existing.resources?.[resource.path] || {};
  metadata.resources[resource.path] = {
    ...generated,
    titleOverride: prior.titleOverride || generated.titleOverride,
    notes: prior.notes || generated.notes
  };
}

await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
console.log(`Generated metadata for ${Object.keys(metadata.resources).length} resources at ${path.relative(curriculumRoot, metadataPath)}`);
