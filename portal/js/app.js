const app = document.querySelector("#app");
const nav = document.querySelector(".main-nav");
const navToggle = document.querySelector(".nav-toggle");

let manifest;

const unitOrder = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"];
const resourceTypes = ["Teacher Guide", "Student Handout", "Appendix", "Slide Deck", "Teacher Resource", "Tracker", "Rubric", "Communication Template", "Safety/Approval Resource", "Showcase Resource"];

navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function normalize(value = "") {
  return String(value).toLowerCase();
}

function resources(filter = {}) {
  return manifest.resources.filter((item) => {
    if (filter.unit && item.unit !== filter.unit) return false;
    if (filter.type && item.type !== filter.type) return false;
    if (filter.audience && item.audience !== filter.audience) return false;
    if (filter.deck && item.relatedDeck !== filter.deck) return false;
    if (filter.query) {
      const haystack = normalize([item.title, item.description, item.unit, item.type, item.audience, item.whenUsed, item.relatedDeck, item.folder, item.tags.join(" ")].join(" "));
      if (!haystack.includes(normalize(filter.query))) return false;
    }
    return true;
  });
}

function card(item) {
  return `
    <article class="card">
      ${previewLink(item, item.title, "title")}
      <p>${escapeHtml(item.description)}</p>
      <div class="meta">
        <span class="pill red">${escapeHtml(item.type)}</span>
        <span class="pill">${escapeHtml(item.unit)}</span>
        ${item.whenUsed ? `<span class="pill">${escapeHtml(item.whenUsed)}</span>` : ""}
        ${item.relatedDeck ? `<span class="pill">${escapeHtml(item.relatedDeck)}</span>` : ""}
        <span class="pill">${escapeHtml(item.extension)}</span>
      </div>
    </article>
  `;
}

function resourceLink(query, label) {
  const item = resources({ query }).find((resource) => resource.folder.includes("Teacher Resources")) || resources({ query })[0];
  if (!item) return escapeHtml(label);
  return previewLink(item, label);
}

function previewLink(item, label = item.title, className = "") {
  return `<a class="${className}" href="#preview-${item.id}" data-resource-id="${item.id}">${escapeHtml(label)}</a>`;
}

function page(title, subtitle, body) {
  app.innerHTML = `
    <section class="page">
      <p class="eyebrow">STARLAB Portal</p>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="lead">${escapeHtml(subtitle)}</p>` : ""}
      ${body}
    </section>
  `;
  setActiveNav();
}

function stats() {
  const s = manifest.summary;
  return `
    <div class="stats">
      <div class="stat"><b>${s.totalResources}</b><span>Total resources</span></div>
      <div class="stat"><b>${s.byType["Slide Deck"] || 0}</b><span>Slide decks</span></div>
      <div class="stat"><b>${s.byType["Student Handout"] || 0}</b><span>Student handouts</span></div>
      <div class="stat"><b>${s.byType["Teacher Guide"] || 0}</b><span>Teaching guides</span></div>
    </div>
  `;
}

function home() {
  const quick = [
    ["I am new to STARLAB", "#start"],
    ["I need this week's materials", "#units"],
    ["Find a handout", "#handouts"],
    ["Open slide deck library", "#slides"],
    ["Check project approval process", "#approval"],
    ["Plan the showcase", "#showcase"],
    ["Review assessment & rubrics", "#assessment"],
    ["Coordinate mentors", "#mentors"],
    ["Open templates & trackers", "#templates"]
  ];
  app.innerHTML = `
    <section class="page">
      <div class="hero">
        <div>
          <p class="eyebrow">${escapeHtml(manifest.program.fullName)}</p>
          <h1>STARLAB</h1>
          <p class="lead">STARLAB is a yearlong student research course designed to help high school students develop, conduct, analyze, and present authentic scientific or engineering research. This portal gives teachers the complete curriculum, slide decks, student handouts, implementation tools, approval systems, assessment resources, and showcase planning materials needed to launch a STARLAB chapter.</p>
          <div class="actions">
            <a class="button primary" href="#start">New Teacher</a>
            <a class="button" href="#index">Search All Resources</a>
          </div>
        </div>
        <div class="hero-logo"><img src="${manifest.program.logo}" alt="STARLAB logo"></div>
      </div>
      <div class="section">${stats()}</div>
      <section class="section split">
        <div>
          <h2>What Should I Open First?</h2>
          <div class="grid">
            ${quick.map(([label, href]) => `<a class="button" href="${href}">${label}</a>`).join("")}
          </div>
        </div>
        <div>
          <h2>Promo Video</h2>
          <div class="video-frame"><iframe src="${manifest.program.video}" title="STARLAB promotional video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
        </div>
      </section>
      <section class="section">
        <h2>Year at a Glance</h2>
        <div class="grid">${unitCards()}</div>
      </section>
    </section>
  `;
  setActiveNav();
}

function unitCards() {
  return unitOrder.map((unit) => {
    const meta = manifest.units[unit];
    return `
      <article class="card">
        <a class="title" href="#unit-${unit.split(" ")[1]}">${unit}: ${escapeHtml(meta.title)}</a>
        <p><strong>${escapeHtml(meta.weeks)}</strong></p>
        <p>${escapeHtml(meta.focus)}</p>
        <div class="meta"><span class="pill red">${resources({ unit }).length} resources</span></div>
      </article>
    `;
  }).join("");
}

function startHere() {
  page("Start Here", "A guided launch path for teachers opening STARLAB for the first time.", `
    <section class="section split">
      <div class="card">
        <h2>Recommended Launch Sequence</h2>
        <ul class="list">
          <li>Read the ${resourceLink("teacher start here guide", "Teacher Start Here Guide")} and ${resourceLink("course operations manual", "Course Operations Manual")}.</li>
          <li>Review the ${resourceLink("full course implementation calendar", "implementation calendar")} and ${resourceLink("master print packet index", "print packet index")}.</li>
          <li>Prepare the ${resourceLink("student onboarding packet", "student onboarding packet")} and ${resourceLink("parent guardian communication pack", "parent or guardian communication resources")}.</li>
          <li>Open <a href="#unit-1">Unit 1</a> and <a href="#slides">Deck 1</a> before planning the first week.</li>
          <li>Skim the <a href="#approval">approval and safety page</a> before students begin project planning.</li>
        </ul>
      </div>
      <div class="card">
        <h2>Common New Teacher Pitfalls</h2>
        <ul class="list">
          <li>Letting students collect data before approval is complete.</li>
          <li>Skipping research journal expectations early in the course.</li>
          <li>Waiting too long to line up mentors and showcase logistics.</li>
          <li>Treating STARLAB as a file collection instead of a paced research system.</li>
        </ul>
      </div>
    </section>
    <section class="section">
      <a class="button primary" href="#home">Return to Home Base</a>
    </section>
  `);
}

function unitsPage() {
  page("Curriculum by Unit", "Browse the six-unit STARLAB course sequence by weeks, focus, deliverables, and materials.", `<section class="section"><div class="grid">${unitCards()}</div></section>`);
}

function unitDetail(number) {
  const unit = `Unit ${number}`;
  const meta = manifest.units[unit];
  if (!meta) return unitsPage();
  const deckList = manifest.decks.filter((deck) => deck.unit === unit);
  const buckets = ["Teacher Guide", "Student Handout", "Appendix", "Rubric"].map((type) => [type, resources({ unit, type })]);
  page(`${unit}: ${meta.title}`, `${meta.weeks}. ${meta.focus}`, `
    <section class="section split">
      <div class="card">
        <h2>Major Student Products</h2>
        <ul class="list">${meta.products.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div class="card">
        <h2>Suggested Teacher Workflow</h2>
        <p>${escapeHtml(meta.workflow)}</p>
        <div class="meta">${deckList.map((deck) => `<span class="pill red">Deck ${Number(deck.number)}: ${escapeHtml(deck.title)}</span>`).join("")}</div>
      </div>
    </section>
    ${buckets.map(([type, items]) => `
      <section class="section">
        <h2>${type}s</h2>
        <div class="grid">${items.length ? items.map(card).join("") : `<p>No ${type.toLowerCase()} resources found in the manifest.</p>`}</div>
      </section>
    `).join("")}
  `);
}

function library(title, subtitle, filter) {
  const items = resources(filter);
  page(title, subtitle, `<section class="section"><div class="grid">${items.map(card).join("")}</div></section>`);
}

function slides() {
  const decks = resources({ type: "Slide Deck" });
  page("Slide Deck Library", "Decks 1-19 with unit connections and primary teaching moments.", `
    <section class="section">
      <div class="grid">
        ${manifest.decks.map((deck) => {
          const file = decks.find((item) => item.relatedDeck === `Deck ${Number(deck.number)}`);
          return `
            <article class="card">
              ${file ? previewLink(file, `Deck ${Number(deck.number)}: ${deck.title}`, "title") : `<span class="title">Deck ${Number(deck.number)}: ${escapeHtml(deck.title)}</span>`}
              <p>${escapeHtml(deck.teachingMoment)}</p>
              <div class="meta"><span class="pill red">${escapeHtml(deck.unit)}</span>${file ? `<span class="pill">${file.sizeLabel}</span>` : `<span class="pill">File not found</span>`}</div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `);
}

function teacherResources() {
  const categories = [
    ["Start Here and Implementation", [
      ["Teacher Start Here Guide", "teacher start here guide"],
      ["Course Operations Manual", "course operations manual"],
      ["Full Course Implementation Calendar", "full course implementation calendar"],
      ["Master Print Packet Index", "master print packet index"],
      ["Student Onboarding Packet", "student onboarding packet"],
      ["STARLAB Syllabus", "starlab syllabus"],
      ["Course Proposal", "course proposal"]
    ]],
    ["Approval, Safety, and Assessment", [
      ["Project Approval System", "project approval system"],
      ["Project Approval Tracker", "project approval tracker"],
      ["Safety Scope Guide by Project Type", "safety scope guide"],
      ["Grading and Assessment Guide", "grading assessment guide"],
      ["AI Use Policy", "ai use policy"]
    ]],
    ["Communication and Partnerships", [
      ["Mentor and Community Partner Toolkit", "mentor community partner toolkit"],
      ["Parent/Guardian Communication Pack", "parent guardian communication pack"]
    ]],
    ["Project Support", [
      ["Sample Student Project Library", "sample student project library"],
      ["Common Problems and What To Do Guide", "common problems what to do guide"],
      ["How to Plan and Schedule Your STARLAB Project", "how to plan schedule starlab project"],
      ["Weekly Progress Tracker Student Guide", "weekly progress tracker student guide"],
      ["STARLAB Weekly Progress Tracker", "weekly progress tracker"]
    ]],
    ["Showcase and Final Presentation", [
      ["Showcase Planning Kit", "showcase planning kit"]
    ]]
  ];
  page("Teacher Resource Library", "Implementation resources from the Start Here folder, organized by teacher workflow.", categories.map(([label, entries]) => {
    return `<section class="section"><h2>${label}</h2><ul class="resource-link-list">${toolkitLinks(entries)}</ul></section>`;
  }).join(""));
}

function topicPage(key) {
  if (key === "approval") return approvalPage();
  if (key === "showcase") return showcasePage();
  if (key === "assessment") return assessmentPage();
  if (key === "mentors") return mentorsPage();
  if (key === "templates") return templatesPage();
  return home();
}

function assessmentPage() {
  const toolkit = [
    ["Grading and Assessment Guide", "grading assessment guide"],
    ["STARLAB Syllabus", "starlab syllabus"],
    ["Weekly Progress Tracker", "weekly progress tracker"],
    ["Research Journal Standards", "research journal standards"],
    ["Research Journal Self-Assessment", "journal self assessment"],
    ["Progress Report Rubric", "progress report rubric"],
    ["Unit 4 Analysis Rubric", "unit 4 analysis rubric"],
    ["Scientific Report Rubric", "scientific report rubric"],
    ["Oral Presentation Rubric", "oral presentation rubric"],
    ["Showcase Rubric", "showcase rubric"],
    ["Project Approval Tracker", "project approval tracker"]
  ];
  page("Assessment & Rubrics", "A practical grading map for collecting evidence across the full STARLAB research cycle.", `
    <section class="section">
      <h2>Syllabus Grading Weights</h2>
      <div class="grid">
        ${[
          ["Project Proposal", "15%", "Research question, background, plan, safety, ethics, feasibility, and approval readiness."],
          ["Research Journal / Documentation", "20%", "Ongoing evidence of planning, data collection, troubleshooting, mentor feedback, and revision."],
          ["Mid-Project Progress Report", "15%", "Progress checkpoint showing what has been tested, what changed, and what still needs work."],
          ["Data Analysis and Interpretation", "20%", "Clean data, selected analysis methods, visuals, uncertainty, limitations, and claims."],
          ["Final Research Report", "15%", "Formal scientific writing: introduction, methods, results, discussion, conclusion, and formatting."],
          ["Oral Presentation", "15%", "Clear communication, evidence defense, Q&A, professionalism, and reflection."]
        ].map(([name, weight, detail]) => `<article class="card"><strong>${name}</strong><p class="eyebrow">${weight}</p><p>${detail}</p></article>`).join("")}
      </div>
    </section>

    <section class="section split">
      <div class="card">
        <h2>What to Collect</h2>
        <ul class="list">
          <li>Project proposal materials and approval decision records.</li>
          <li>Research journal entries showing dates, trials, decisions, problems, and revisions.</li>
          <li>Mid-project progress evidence and conference notes.</li>
          <li>Clean data tables, calculations, graphs, and analysis explanations.</li>
          <li>Final report drafts, peer review notes, and revisions.</li>
          <li>Presentation product, speaking notes, Q&A preparation, and final reflection.</li>
        </ul>
      </div>
      <div class="card">
        <h2>Assessment Rhythm</h2>
        <ol class="decision-list">
          <li><strong>Before testing</strong><span>Score proposal readiness only after approval and safety review are complete.</span></li>
          <li><strong>During data collection</strong><span>Grade documentation habits through journals, trackers, and teacher conferences.</span></li>
          <li><strong>At midpoint</strong><span>Use the progress report to assess troubleshooting, evidence quality, and next-step planning.</span></li>
          <li><strong>After data collection</strong><span>Assess analysis choices, graph quality, uncertainty, and claim-evidence-reasoning.</span></li>
          <li><strong>At the end</strong><span>Score final report, oral presentation, Q&A, and portfolio/reflection evidence.</span></li>
        </ol>
      </div>
    </section>

    <section class="section">
      <h2>Major Assessment Checkpoints</h2>
      <div class="grid">
        ${[
          ["Proposal", "Use Unit 2 planning, safety, ethics, and approval materials before allowing pilot testing."],
          ["Documentation", "Look for dated evidence, raw data, revisions, troubleshooting, and mentor feedback."],
          ["Progress Report", "Check whether students can explain what happened, what changed, and what evidence supports next steps."],
          ["Analysis", "Evaluate data cleaning, analysis method fit, graphing choices, uncertainty, and limitations."],
          ["Final Report", "Assess formal scientific structure, accuracy, evidence use, and revision quality."],
          ["Presentation", "Assess communication, visual design, audience adaptation, evidence defense, and professionalism."]
        ].map(([name, detail]) => `<article class="card"><strong>${name}</strong><p>${detail}</p></article>`).join("")}
      </div>
    </section>

    <section class="section">
      <h2>Assessment Toolkit</h2>
      <ul class="resource-link-list">${toolkitLinks(toolkit)}</ul>
    </section>
  `);
}

function findResource(query) {
  return resources({ query })[0];
}

function approvalResourceLinks() {
  const links = [
    ["Project Approval System", "starlab project approval system"],
    ["Project Approval Tracker", "project approval tracker"],
    ["Safety Scope Guide by Project Type", "safety scope guide"],
    ["Risk Assessment Matrix", "risk assessment matrix"],
    ["Safety and Ethics Red Flags", "safety ethics red flags"],
    ["Project Approval Checklist", "project approval checklist"],
    ["Safety and Risk Assessment Handout", "safety risk assessment"],
    ["Ethics and Approval Screening Handout", "ethics approval screening"],
    ["Week 4 Teacher Guide", "formal research plan safety ethics approval"]
  ];
  return links.map(([label, query]) => {
    const item = findResource(query);
    return item ? `<li>${previewLink(item, label)}<span>${escapeHtml(item.unit)} · ${escapeHtml(item.type)}</span></li>` : "";
  }).join("");
}

function approvalPage() {
  page("Project Approval & Safety", "A decision-support workflow for approving, pausing, redirecting, or escalating student research projects before testing begins.", `
    <section class="section split">
      <div class="card">
        <h2>Approval Workflow</h2>
        <ol class="decision-list">
          <li><strong>Define the project.</strong><span>Student names the research question, hypothesis or design criteria, variables, materials, procedure, and intended data.</span></li>
          <li><strong>Screen for safety and ethics.</strong><span>Use the risk assessment, ethics screening, red flags, and safety scope guide before any testing.</span></li>
          <li><strong>Check feasibility.</strong><span>Confirm time, materials, supervision, sample size, data quality, and whether the plan can be done in school conditions.</span></li>
          <li><strong>Choose an approval status.</strong><span>Approve, approve with modifications, request revision, pause for additional review, or reject the current form.</span></li>
          <li><strong>Record the decision.</strong><span>Update the approval tracker and give students concrete next steps before Unit 3 pilot testing.</span></li>
        </ol>
      </div>
      <div class="card">
        <h2>Teacher Decision Questions</h2>
        <ul class="list">
          <li>Can this project be completed without unsafe materials, procedures, or supervision gaps?</li>
          <li>Does the plan avoid human-subject, animal, privacy, medical, or environmental concerns that need extra review?</li>
          <li>Are the variables, data collection plan, and success criteria clear enough to test?</li>
          <li>Would a reasonable adult understand exactly what the student will do next?</li>
          <li>If something goes wrong, is there a clear pause, revise, or redirect path?</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <h2>Approval Status Guide</h2>
      <div class="grid">
        ${[
          ["Approved to begin pilot testing", "The plan is clear, feasible, and appropriately safe for small-scale testing."],
          ["Approved with modifications", "The core idea is acceptable, but students must make named changes before testing."],
          ["Needs revision", "The plan is incomplete, unclear, or not yet testable."],
          ["Needs additional safety review", "The teacher needs more information, supervision, or administrative guidance before approving."],
          ["Needs ethics or administrative review", "The project may involve privacy, human subjects, living organisms, medical claims, restricted materials, or school policy concerns."],
          ["Needs mentor review", "A content expert should review technical feasibility, specialized procedures, or interpretation risks."],
          ["Not approved in current form", "The project cannot proceed as written and needs a safer or more feasible redesign."]
        ].map(([status, meaning]) => `<article class="card"><strong>${status}</strong><p>${meaning}</p></article>`).join("")}
      </div>
    </section>

    <section class="section split">
      <div class="card">
        <h2>Before Students Test</h2>
        <ul class="list">
          <li>Formal research plan is complete enough for an adult to follow.</li>
          <li>Safety and risk assessment is complete.</li>
          <li>Ethics and approval screening is complete.</li>
          <li>Teacher has checked the risk matrix and red-flag list.</li>
          <li>Approval tracker has a current status and next step.</li>
        </ul>
      </div>
      <div class="card">
        <h2>Pause or Redirect When</h2>
        <ul class="list">
          <li>The project requires unsafe materials, tools, organisms, or locations.</li>
          <li>Students cannot explain what data they will collect or how they will collect it.</li>
          <li>The work depends on private, medical, or sensitive personal information.</li>
          <li>The procedure is too broad, expensive, long, or uncontrolled for the course timeline.</li>
          <li>A safer version of the same research question is possible.</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <h2>Approval Toolkit</h2>
      <ul class="resource-link-list">${approvalResourceLinks()}</ul>
    </section>
  `);
}

function toolkitLinks(entries) {
  return entries.map(([label, query]) => {
    const item = findResource(query);
    return item ? `<li>${previewLink(item, label)}<span>${escapeHtml(item.unit)} · ${escapeHtml(item.type)}</span></li>` : "";
  }).join("");
}

function showcasePage() {
  const toolkit = [
    ["Showcase Planning Kit", "showcase planning kit"],
    ["Showcase Planning Guide for Teachers", "showcase planning guide for teachers"],
    ["Sample Showcase Schedule", "sample showcase schedule"],
    ["Visitor Question Guide", "visitor question guide"],
    ["Showcase Rubric", "showcase rubric"],
    ["Oral Presentation Rubric", "oral presentation rubric"],
    ["Final Showcase Readiness Checklist", "final showcase readiness checklist"],
    ["Audience Feedback Collection Form", "audience feedback collection form"],
    ["Presentation Product Final Check", "presentation product final check"],
    ["Post Presentation Reflection", "post presentation reflection"],
    ["Portfolio Checklist", "portfolio checklist"]
  ];
  page("Showcase Planning", "A practical planning hub for moving from final presentation practice to a polished public showcase or final defense.", `
    <section class="section split">
      <div class="card">
        <h2>Showcase Timeline</h2>
        <ol class="decision-list">
          <li><strong>Weeks 29-30: Refine the message.</strong><span>Students tighten their research story, practice multiple presentation lengths, and gather peer feedback.</span></li>
          <li><strong>Week 31: Prepare for questions.</strong><span>Students defend evidence, rehearse Q&A, and identify weak spots in claims or visuals.</span></li>
          <li><strong>Week 32: Finalize logistics.</strong><span>Teacher confirms schedule, room setup, visitor flow, technology, materials, and student readiness.</span></li>
          <li><strong>Week 33: Host the showcase.</strong><span>Students present to visitors, collect feedback, answer questions, and demonstrate professionalism.</span></li>
          <li><strong>Week 34: Reflect and archive.</strong><span>Students complete reflection, portfolio, feedback review, and next-step planning.</span></li>
        </ol>
      </div>
      <div class="card">
        <h2>Teacher Planning Questions</h2>
        <ul class="list">
          <li>Who is the audience: classmates, families, mentors, administrators, community visitors, or judges?</li>
          <li>Will students present posters, boards, slides, prototypes, demonstrations, or oral defenses?</li>
          <li>What schedule prevents crowding and gives every student meaningful feedback?</li>
          <li>What should visitors ask, notice, and record?</li>
          <li>What does a student need to have ready before showcase day?</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <h2>Showcase Readiness Checks</h2>
      <div class="grid">
        ${[
          ["Student presentation is complete", "The research question, method, data, interpretation, limitations, and next steps are clear."],
          ["Visual product is ready", "Poster, board, slide deck, prototype, or display is readable, accurate, and professionally organized."],
          ["Q&A preparation is complete", "Students can answer evidence, limitation, method, and future-work questions without overclaiming."],
          ["Visitor logistics are set", "Schedule, room layout, invitation language, visitor guidance, and feedback collection are prepared."],
          ["Assessment tools are ready", "Rubrics, audience feedback forms, and teacher scoring workflows are printed or linked."],
          ["Reflection path is ready", "Students know how they will process feedback, archive artifacts, and complete final reflection."]
        ].map(([check, detail]) => `<article class="card"><strong>${check}</strong><p>${detail}</p></article>`).join("")}
      </div>
    </section>

    <section class="section split">
      <div class="card">
        <h2>Student Setup Checklist</h2>
        <ul class="list">
          <li>Final presentation product is complete and proofread.</li>
          <li>Speaking notes are practiced, not read word-for-word.</li>
          <li>Data visuals are labeled and ethically presented.</li>
          <li>Limitations and uncertainty are acknowledged clearly.</li>
          <li>Student can explain what changed during the research process.</li>
        </ul>
      </div>
      <div class="card">
        <h2>Visitor Experience Checklist</h2>
        <ul class="list">
          <li>Visitors know where to go and what kind of feedback to give.</li>
          <li>Question prompts are available for non-science audiences.</li>
          <li>Students have enough time for presentation and questions.</li>
          <li>Feedback forms are collected before visitors leave.</li>
          <li>Mentors and partners are thanked after the event.</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <h2>Showcase Toolkit</h2>
      <ul class="resource-link-list">${toolkitLinks(toolkit)}</ul>
    </section>
  `);
}

function mentorsPage() {
  const toolkit = [
    ["Mentor and Community Partner Toolkit", "mentor community partner toolkit"],
    ["Parent/Guardian Communication Pack", "parent guardian communication pack"],
    ["Mentor Feedback Request Template", "mentor feedback request template"],
    ["Mentor Communication Guidelines", "mentor communication guidelines"],
    ["Teacher Conference Guide", "teacher conference guide"],
    ["Research Plan Conference Form", "research plan conference form"],
    ["Teacher Data Check Conference Prompts", "teacher data check conference prompts"],
    ["Midpoint Conference Questions", "midpoint conference questions"],
    ["Teacher Conference Questions for Interpretation", "conference questions interpretation"],
    ["Audience Types and Communication Strategies", "audience types communication strategies"],
    ["Audience Feedback Collection Form", "audience feedback collection form"]
  ];
  page("Mentors & Community Partners", "A workflow for recruiting, preparing, and using mentors without letting outside support overwhelm the teacher or student research process.", `
    <section class="section split">
      <div class="card">
        <h2>Mentor Workflow</h2>
        <ol class="decision-list">
          <li><strong>Identify useful expertise.</strong><span>Match mentors to student needs: method design, safety review, field knowledge, troubleshooting, analysis, or presentation feedback.</span></li>
          <li><strong>Set expectations early.</strong><span>Clarify that mentors advise, ask questions, and give feedback; they do not complete student work.</span></li>
          <li><strong>Use structured communication.</strong><span>Have students send concise context, specific questions, and a clear timeline before asking for feedback.</span></li>
          <li><strong>Capture the feedback.</strong><span>Students document mentor advice, what they accepted or rejected, and how it changed the project.</span></li>
          <li><strong>Close the loop.</strong><span>Thank mentors, invite them to the showcase when appropriate, and let them see how their guidance helped.</span></li>
        </ol>
      </div>
      <div class="card">
        <h2>Good Mentor Tasks</h2>
        <ul class="list">
          <li>Ask whether the research question is focused and feasible.</li>
          <li>Review safety, materials, and procedure concerns.</li>
          <li>Suggest better data collection or analysis methods.</li>
          <li>Help students interpret limitations without overclaiming.</li>
          <li>Practice presentation questions before the showcase.</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <h2>When to Involve Mentors</h2>
      <div class="grid">
        ${[
          ["Unit 1", "Use broad mentor examples to help students see what real research fields look like."],
          ["Unit 2", "Ask mentors to react to project plans, feasibility, safety, and background research."],
          ["Unit 3", "Use mentors for troubleshooting, method revision, and midpoint feedback."],
          ["Unit 4", "Ask mentors to help students think through data analysis, limitations, and interpretation."],
          ["Unit 5", "Use mentors as peer-review-style readers for report clarity and presentation readiness."],
          ["Unit 6", "Invite mentors to practice Q&A, visit the showcase, or provide final audience feedback."]
        ].map(([unit, detail]) => `<article class="card"><strong>${unit}</strong><p>${detail}</p></article>`).join("")}
      </div>
    </section>

    <section class="section split">
      <div class="card">
        <h2>Student Communication Norms</h2>
        <ul class="list">
          <li>Use a professional greeting and identify the STARLAB course.</li>
          <li>Explain the project in four to six sentences.</li>
          <li>Ask two or three specific questions, not “What do you think?”</li>
          <li>Include the timeline for when feedback is needed.</li>
          <li>Send a thank-you message and document what changed afterward.</li>
        </ul>
      </div>
      <div class="card">
        <h2>Teacher Guardrails</h2>
        <ul class="list">
          <li>Keep all mentor communication school-appropriate and transparent.</li>
          <li>Do not let mentors approve safety-sensitive work alone.</li>
          <li>Require students to document advice instead of simply following it.</li>
          <li>Use mentor feedback as evidence of process, not as a substitute for student reasoning.</li>
          <li>Provide alternative supports for students who cannot access an outside mentor.</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <h2>Mentor & Partner Toolkit</h2>
      <ul class="resource-link-list">${toolkitLinks(toolkit)}</ul>
    </section>
  `);
}

function templatesPage() {
  const operationsToolkit = [
    ["Full Course Implementation Calendar", "full course implementation calendar"],
    ["Master Print Packet Index", "master print packet index"],
    ["Project Approval Tracker", "project approval tracker"],
    ["STARLAB Weekly Progress Tracker", "weekly progress tracker"],
    ["Weekly Progress Tracker Student Guide", "weekly progress tracker student guide"],
    ["How to Plan and Schedule Your STARLAB Project", "how to plan schedule starlab project"],
    ["Project Approval System", "project approval system"],
    ["Showcase Planning Kit", "showcase planning kit"],
    ["Student Onboarding Packet", "student onboarding packet"],
    ["Course Operations Manual", "course operations manual"]
  ];
  const studentTemplates = [
    ["Formal Research Plan Template", "formal research plan template"],
    ["Research Plan Conference Form", "research plan conference form"],
    ["Project Timeline Planner", "project timeline planner"],
    ["Data Collection Plan", "data collection plan"],
    ["Data Analysis Plan", "data analysis plan"],
    ["Scientific Report Template", "scientific report template"],
    ["Full Report Checklist", "full report checklist"],
    ["Presentation Planning Guide", "presentation planning guide"],
    ["Portfolio Checklist", "portfolio checklist"]
  ];
  page("Templates & Trackers", "An operations hub for the calendars, spreadsheets, templates, checklists, and trackers that keep STARLAB manageable.", `
    <section class="section">
      <h2>Core Operations Tools</h2>
      <div class="grid">
        ${[
          ["Course calendar", "Use before the year starts and during pacing checks to see where each unit fits."],
          ["Print packet index", "Use when preparing student handouts, appendix materials, and teacher copies."],
          ["Project approval tracker", "Use during Unit 2 and before Unit 3 to track approval status and next steps."],
          ["Weekly progress tracker", "Use during data collection to monitor student progress, barriers, and documentation."],
          ["Showcase planning kit", "Use in Units 5-6 to coordinate event logistics, visitor materials, and final presentation needs."],
          ["Student templates", "Use whenever students need a structured planning, analysis, reporting, or reflection document."]
        ].map(([tool, detail]) => `<article class="card"><strong>${tool}</strong><p>${detail}</p></article>`).join("")}
      </div>
    </section>

    <section class="section split">
      <div class="card">
        <h2>When to Use Trackers</h2>
        <ol class="decision-list">
          <li><strong>Before school starts</strong><span>Open the implementation calendar, course operations manual, and print packet index.</span></li>
          <li><strong>Unit 2 approval window</strong><span>Use the project approval system and approval tracker to document every student project's status.</span></li>
          <li><strong>Units 3-4 data collection</strong><span>Use the weekly progress tracker and conference prompts to keep projects from drifting.</span></li>
          <li><strong>Units 5-6 final products</strong><span>Use report, presentation, portfolio, and showcase templates to manage deadlines and evidence.</span></li>
        </ol>
      </div>
      <div class="card">
        <h2>Template Rules of Thumb</h2>
        <ul class="list">
          <li>Use trackers for teacher visibility; use handouts/templates for student thinking.</li>
          <li>Update approval and progress trackers during conferences, not days later.</li>
          <li>Keep one source of truth for approval status.</li>
          <li>Print only the materials needed for the current unit or week.</li>
          <li>Use the resource index when you cannot remember where a template lives.</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <h2>Teacher Operations Toolkit</h2>
      <ul class="resource-link-list">${toolkitLinks(operationsToolkit)}</ul>
    </section>

    <section class="section">
      <h2>Student Planning Templates</h2>
      <ul class="resource-link-list">${toolkitLinks(studentTemplates)}</ul>
    </section>
  `);
}

function options(values, selected = "") {
  return `<option value="">All</option>${values.map((value) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}`;
}

function indexPage(preset = {}) {
  app.innerHTML = `
    <section class="page">
      <p class="eyebrow">Searchable Database</p>
      <h1>Resource Index</h1>
      <p class="lead">Search and filter every file discovered by the generated resource manifest.</p>
      <form class="toolbar" id="filters">
        <input name="query" type="search" placeholder="Search name, tags, description, folder..." value="${escapeHtml(preset.query || "")}">
        <select name="unit" aria-label="Filter by unit">${options(["Coursewide", ...unitOrder], preset.unit)}</select>
        <select name="type" aria-label="Filter by type">${options(resourceTypes, preset.type)}</select>
        <select name="audience" aria-label="Filter by audience">${options(["Teacher", "Student", "Parent/Guardian", "Mentor/Partner", "Administrator", "Visitor"], preset.audience)}</select>
        <select name="deck" aria-label="Filter by deck">${options(manifest.decks.map((deck) => `Deck ${Number(deck.number)}`), preset.deck)}</select>
      </form>
      <section class="section" id="results"></section>
    </section>
  `;
  const form = document.querySelector("#filters");
  const render = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    const items = resources(data);
    document.querySelector("#results").innerHTML = `
      <h2>${items.length} Resources</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Resource Name</th><th>Unit</th><th>Type</th><th>Audience</th><th>When Used</th><th>Related Deck</th><th>File Location</th><th>Tags</th></tr></thead>
          <tbody>${items.map((item) => `
            <tr>
              <td>${previewLink(item)}<br>${escapeHtml(item.description)}</td>
              <td>${escapeHtml(item.unit)}</td>
              <td>${escapeHtml(item.type)}</td>
              <td>${escapeHtml(item.audience)}</td>
              <td>${escapeHtml(item.whenUsed || "TBD")}</td>
              <td>${escapeHtml(item.relatedDeck || "TBD")}</td>
              <td>${escapeHtml(item.folder)}</td>
              <td>${item.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join(" ")}</td>
            </tr>`).join("")}</tbody>
        </table>
      </div>
    `;
  };
  form.addEventListener("input", render);
  render();
  setActiveNav();
}

function setActiveNav() {
  const route = location.hash.replace("#", "") || "home";
  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${route}`);
  });
}

function route() {
  nav.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
  const hash = location.hash.replace("#", "") || "home";
  if (hash === "home") return home();
  if (hash === "start") return startHere();
  if (hash === "units") return unitsPage();
  if (hash.startsWith("unit-")) return unitDetail(hash.split("-")[1]);
  if (hash === "slides") return slides();
  if (hash === "handouts") return library("Handout Library", "Student-facing handouts organized by unit and searchable from the master index.", { type: "Student Handout" });
  if (hash === "appendixes") return library("Appendix Library", "Supplemental appendixes, rubrics, checklists, and implementation references.", { type: "Appendix" });
  if (hash === "teacher") return teacherResources();
  if (["assessment", "approval", "mentors", "showcase", "templates"].includes(hash)) return topicPage(hash);
  if (hash === "index") return indexPage();
  return home();
}

fetch("data/resources.json")
  .then((response) => response.json())
  .then((data) => {
    manifest = data;
    window.addEventListener("hashchange", route);
    route();
  })
  .catch((error) => {
    app.innerHTML = `<section class="page"><h1>Manifest Not Loaded</h1><p>${escapeHtml(error.message)}</p></section>`;
  });

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-resource-id]");
  if (!link || !manifest) return;
  const item = manifest.resources.find((resource) => resource.id === link.dataset.resourceId);
  if (!item) return;
  event.preventDefault();
  openPreview(item);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePreview();
});

function openPreview(item) {
  closePreview();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="preview-backdrop" role="presentation" data-close-preview></div>
    <section class="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <button class="preview-close" type="button" data-close-preview aria-label="Close preview">Close</button>
      <div class="preview-header">
        <p class="eyebrow">${escapeHtml(item.type)} · ${escapeHtml(item.unit)}</p>
        <h2 id="preview-title">${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.description)}</p>
        <div class="meta">
          <span class="pill red">${escapeHtml(item.extension)}</span>
          <span class="pill">${escapeHtml(item.sizeLabel)}</span>
          ${item.whenUsed ? `<span class="pill">${escapeHtml(item.whenUsed)}</span>` : ""}
          ${item.relatedDeck ? `<span class="pill">${escapeHtml(item.relatedDeck)}</span>` : ""}
        </div>
      </div>
      <div class="preview-body">${previewContent(item)}</div>
      <div class="preview-actions">
        <a class="button primary" href="${item.href}" target="_blank" rel="noopener">Open / Download File</a>
        <button class="button" type="button" data-close-preview>Back to Portal</button>
      </div>
    </section>
  `);
  document.querySelector(".preview-close")?.focus();
  document.querySelectorAll("[data-close-preview]").forEach((control) => control.addEventListener("click", closePreview));
}

function closePreview() {
  document.querySelector(".preview-modal")?.remove();
  document.querySelector(".preview-backdrop")?.remove();
}

function previewContent(item) {
  const ext = item.extension.toLowerCase();
  const officeExts = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return `<img class="preview-media" src="${item.href}" alt="${escapeHtml(item.title)} preview">`;
  }
  if (ext === "mp4") {
    return `<video class="preview-media" controls preload="metadata" src="${item.href}"></video>`;
  }
  if (["pdf", "txt", "md"].includes(ext)) {
    return `<iframe class="preview-frame" src="${item.href}" title="${escapeHtml(item.title)} preview"></iframe>`;
  }
  if (officeExts.includes(ext)) {
    const publicUrl = publicResourceUrl(item);
    if (publicUrl) {
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;
      return `<iframe class="preview-frame" src="${viewerUrl}" title="${escapeHtml(item.title)} Microsoft Office preview"></iframe>`;
    }
    return `
      <div class="preview-unavailable">
        <h3>Online Preview Available After Deployment</h3>
        <p>${escapeHtml(item.extension)} previews need a publicly reachable HTTPS file URL. This local server address cannot be reached by Microsoft Office Viewer.</p>
        <p>Once this portal is deployed to the web, this same preview window can embed Word, PowerPoint, and Excel files before teachers open or download them.</p>
        <p><strong>File location:</strong> ${escapeHtml(item.folder)}</p>
      </div>
    `;
  }
  return `
    <div class="preview-unavailable">
      <h3>Preview Not Available in This Browser</h3>
      <p>${escapeHtml(item.extension)} files usually need Microsoft Office, Google Drive, or a PDF conversion before their contents can be embedded in a local static portal.</p>
      <p>This preview step prevents an automatic download and lets teachers confirm they have the right resource before opening it.</p>
      <p><strong>File location:</strong> ${escapeHtml(item.folder)}</p>
    </div>
  `;
}

function publicResourceUrl(item) {
  if (location.protocol !== "https:" && location.hostname !== "localhost") return "";
  const localHosts = ["localhost", "127.0.0.1", "::1"];
  if (localHosts.includes(location.hostname)) return "";
  return new URL(item.href, location.href).href;
}
