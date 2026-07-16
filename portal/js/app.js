const app = document.querySelector("#app");
const nav = document.querySelector(".main-nav");
const navToggle = document.querySelector(".nav-toggle");

let manifest;
let courseMap;
let gameCleanup = null;
let eggBuffer = "";

const unitOrder = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"];
const resourceTypes = ["Teacher Guide", "Student Handout", "Appendix", "Slide Deck", "Teacher Resource", "Tracker", "Rubric", "Communication Template", "Safety/Approval Resource", "Showcase Resource"];
const unitWeeks = {
  "Unit 1": [1, 2],
  "Unit 2": [3, 4],
  "Unit 3": [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  "Unit 4": [17, 18, 19, 20],
  "Unit 5": [21, 22, 23, 24, 25, 26, 27, 28],
  "Unit 6": [29, 30, 31, 32, 33, 34]
};

navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  eggBuffer = `${eggBuffer}${event.key.toLowerCase()}`.slice(-7);
  if (eggBuffer === "starlab") {
    location.hash = "#asteroids";
    eggBuffer = "";
  }
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function normalize(value = "") {
  return String(value).toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function resources(filter = {}) {
  return manifest.resources.filter((item) => {
    if (filter.unit && item.unit !== filter.unit) return false;
    if (filter.type && item.type !== filter.type) return false;
    if (filter.audience && item.audience !== filter.audience) return false;
    if (filter.deck && item.relatedDeck !== filter.deck) return false;
    if (filter.query) {
      const haystack = normalize(item.searchText || [item.title, item.description, item.purpose, item.teacherUse, item.studentUse, item.unit, item.type, item.audience, item.whenUsed, item.relatedDeck, item.folder, item.tags?.join(" "), item.keywords?.join(" "), item.useCategory].join(" "));
      const query = normalize(filter.query);
      const terms = query.split(/\s+/).filter(Boolean);
      const words = haystack.split(/[^a-z0-9&]+/).filter(Boolean);
      if (!haystack.includes(query) && !terms.every((term) => words.includes(term))) return false;
    }
    return true;
  });
}

function unitForWeek(week) {
  return courseWeek(week)?.unit || Object.entries(unitWeeks).find(([, weeks]) => weeks.includes(Number(week)))?.[0] || "Coursewide";
}

function courseWeek(week) {
  return courseMap?.weeks.find((item) => item.week === Number(week));
}

function resourceByCatalogRef(catalogRef) {
  return manifest.resources.find((item) => item.catalogRef === catalogRef);
}

function resourcesByCatalogRefs(catalogRefs = []) {
  return catalogRefs.map(resourceByCatalogRef).filter(Boolean);
}

function weekNumberFromResource(item) {
  const match = `${item.whenUsed} ${item.title} ${item.path}`.match(/Week\s*[_ -]?(\d+)/i);
  return match ? Number(match[1]) : null;
}

function deckNumberFromResource(item) {
  const match = `${item.relatedDeck} ${item.title}`.match(/(?:Deck\s*)?(\d{1,2})/i);
  return item.type === "Slide Deck" && match ? Number(match[1]) : null;
}

function resourcesForWeek(week) {
  const mapping = courseWeek(week);
  if (!mapping) return [];
  const teacherGuide = resourceByCatalogRef(`U${mapping.unit.split(" ")[1]} TG W${mapping.week}`);
  const decks = resourcesByCatalogRefs([...mapping.primaryDecks, ...mapping.secondaryDecks].map((number) => `D${number}`));
  const mapped = resourcesByCatalogRefs([...mapping.required, ...mapping.optional]);
  return [...new Map([teacherGuide, ...decks, ...mapped].filter(Boolean).map((item) => [item.id, item])).values()];
}

function resourceBadges(item) {
  const badges = [];
  if (item.audience === "Student") badges.push("Student-facing");
  if (item.audience === "Teacher") badges.push("Teacher-only");
  if (["DOCX", "PPTX", "XLSX"].includes(item.extension)) badges.push("Editable");
  if (["PDF", "PNG", "MP4", "TXT", "MD"].includes(item.extension)) badges.push("Preview");
  if (["Student Handout", "Appendix", "Rubric"].includes(item.type)) badges.push("Print");
  if (["Teacher Guide", "Slide Deck"].includes(item.type)) badges.push("Teach");
  if (["Rubric", "Tracker"].includes(item.type) || normalize(item.title).includes("assessment")) badges.push("Assessment");
  if (normalize(item.title).includes("checklist")) badges.push("Checklist");
  if (normalize(item.title).includes("approval") || normalize(item.title).includes("safety")) badges.push("Approval");
  if (item.required) badges.push("Required");
  if (item.useCategory === "optional") badges.push("Optional");
  if (item.printRecommended) badges.push("Print-ready");
  return [...new Set(badges)].slice(0, 4);
}

function card(item) {
  return `
    <article class="card">
      ${previewLink(item, item.title, "title")}
      <p>${escapeHtml(item.purpose || item.description)}</p>
      <div class="badges">${resourceBadges(item).map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}</div>
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

function resourceLink(key, label) {
  const item = curatedResource(key);
  if (!item) return escapeHtml(label);
  return previewLink(item, label);
}

function previewLink(item, label = item.title, className = "") {
  return `<a class="${className}" href="#preview-${item.id}" data-resource-id="${item.id}">${escapeHtml(label)}</a>`;
}

function resourceTypeHeading(type) {
  return {
    "Appendix": "Appendices",
    "Rubric": "Rubrics",
    "Teacher Guide": "Teacher Guides",
    "Student Handout": "Student Handouts"
  }[type] || `${type}s`;
}

function page(title, subtitle, body) {
  app.innerHTML = `
    <section class="page">
      ${breadcrumbs()}
      <p class="eyebrow">STARLAB Portal</p>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="lead">${escapeHtml(subtitle)}</p>` : ""}
      ${body}
    </section>
  `;
  setActiveNav();
}

function cleanupGame() {
  if (gameCleanup) {
    gameCleanup();
    gameCleanup = null;
  }
}

function breadcrumbs() {
  const hash = location.hash.replace("#", "") || "home";
  const crumbs = [["Home", "#home"]];
  if (hash === "home") return "";
  if (hash === "start") crumbs.push(["Start Here", "#start"]);
  else if (hash === "new-teacher") crumbs.push(["First Time User", "#new-teacher"]);
  else if (hash === "units") crumbs.push(["Curriculum by Unit", "#units"]);
  else if (hash.startsWith("unit-")) {
    const unit = `Unit ${hash.split("-")[1]}`;
    crumbs.push(["Curriculum by Unit", "#units"], [unit, `#${hash}`]);
  } else if (hash === "week" || hash.startsWith("week-")) {
    const week = hash.startsWith("week-") ? hash.split("-")[1] : "1";
    crumbs.push(["This Week's Materials", "#week"], [`Week ${week}`, `#week-${week}`]);
  } else {
    const labels = {
      slides: "Slide Deck Library",
      about: "About STARLAB",
      handouts: "Handout Library",
      appendixes: "Appendix Library",
      teacher: "Teacher Resources",
      assessment: "Assessment & Rubrics",
      approval: "Project Approval & Safety",
      mentors: "Mentors & Community Partners",
      showcase: "Showcase Planning",
      templates: "Templates & Trackers",
      index: "Resource Index"
    };
    crumbs.push([labels[hash] || "Portal", `#${hash}`]);
  }
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs.map(([label, href], index) => index === crumbs.length - 1 ? `<span>${escapeHtml(label)}</span>` : `<a href="${href}">${escapeHtml(label)}</a>`).join("<span>/</span>")}</nav>`;
}

function home() {
  const quickGroups = [
    ["Start", [
      ["Start Here", "#start"],
      ["First Time User", "#new-teacher"]
    ]],
    ["Teach", [
      ["This Week's Materials", "#week"],
      ["Slide Decks", "#slides"],
      ["Student Handouts", "#handouts"]
    ]],
    ["Manage Projects", [
      ["Project Approval & Safety", "#approval"],
      ["Mentors & Community Partners", "#mentors"],
      ["Templates & Trackers", "#templates"]
    ]],
    ["Assess", [
      ["Assessment & Rubrics", "#assessment"]
    ]],
    ["Showcase", [
      ["Showcase Planning", "#showcase"]
    ]]
  ];
  app.innerHTML = `
    <section class="page">
      <div class="home-hero">
        <img src="${manifest.program.logo}" alt="STARLAB logo">
        <p class="eyebrow">${escapeHtml(manifest.program.fullName)}</p>
        <div class="actions centered">
          <a class="button primary" href="#new-teacher">First Time User</a>
          <a class="button" href="#index">Search All Resources</a>
        </div>
        <div class="home-video">
          <div class="video-frame"><iframe src="${manifest.program.video}" title="STARLAB promotional video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
        </div>
      </div>
      <section class="section">
        <h2>Quick Links</h2>
        <div class="quick-link-groups">
          ${quickGroups.map(([group, links]) => `
            <article class="quick-link-card">
              <h3>${escapeHtml(group)}</h3>
              <div class="quick-link-list">
                ${links.map(([label, href], index) => `<a class="button${index === 0 ? " primary" : ""}" href="${href}">${escapeHtml(label)}</a>`).join("")}
              </div>
            </article>
          `).join("")}
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

function aboutPage() {
  page("About STARLAB", "Science Through Advanced Research, Learning, Application, and Building.", `
    <section class="section split">
      <div class="card">
        <h2>What STARLAB Is</h2>
        <p>STARLAB is a yearlong student research course designed to help high school students develop, conduct, analyze, and present authentic scientific or engineering research.</p>
        <p>This portal gives teachers the complete curriculum, slide decks, student handouts, implementation tools, approval systems, assessment resources, and showcase planning materials needed to launch a STARLAB chapter.</p>
      </div>
      <div class="card">
        <h2>What Makes It Different</h2>
        <ul class="list">
          <li>Students move through a real research cycle instead of isolated lab activities.</li>
          <li>Project approval, safety, mentoring, analysis, reporting, and presentation are built into the course structure.</li>
          <li>Teachers get a full implementation system, not just lesson files.</li>
          <li>The course culminates in public presentation, reflection, and portfolio work.</li>
        </ul>
      </div>
    </section>
    <section class="section">
      <h2>Course Arc</h2>
      <div class="grid">${unitCards()}</div>
    </section>
    <section class="section split">
      <div class="card">
        <h2>Primary Audience</h2>
        <p>STARLAB is built for teachers who want to help students launch, manage, and complete authentic research while keeping the classroom workflow organized and safe.</p>
      </div>
      <div class="card">
        <h2>Best First Step</h2>
        <p>New teachers should begin with the Start Here path, then use This Week's Materials once the course is underway.</p>
        <div class="actions"><a class="button primary" href="#start">Start Here</a><a class="button" href="#week">This Week's Materials</a></div>
      </div>
    </section>
  `);
}

function asteroidsPage() {
  page("STARLAB Field Test", "An off-the-books systems check from the outer edge of the curriculum.", `
    <section class="section game-shell">
      <div class="game-toolbar">
        <div>
          <strong>Asteroid Lab</strong>
          <span>Arrow keys or WASD to fly. Space to fire. Enter to restart.</span>
        </div>
        <a class="button" href="#home">Exit to Portal</a>
      </div>
      <canvas id="asteroids-canvas" width="960" height="540" aria-label="STARLAB asteroids mini game"></canvas>
      <p class="game-note">Hidden route: type STARLAB anywhere in the portal to return here.</p>
    </section>
  `);
  startAsteroids();
}

function startAsteroids() {
  const canvas = document.querySelector("#asteroids-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const state = {
    ship: { x: 480, y: 270, vx: 0, vy: 0, angle: -Math.PI / 2, cooldown: 0, invulnerable: 120 },
    bullets: [],
    asteroids: [],
    particles: [],
    score: 0,
    lives: 3,
    level: 1,
    over: false,
    frame: 0,
    raf: 0
  };

  function resetLevel() {
    state.bullets = [];
    state.asteroids = [];
    const count = 4 + state.level;
    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      const x = edge === 0 ? 0 : edge === 1 ? canvas.width : Math.random() * canvas.width;
      const y = edge === 2 ? 0 : edge === 3 ? canvas.height : Math.random() * canvas.height;
      state.asteroids.push(makeAsteroid(x, y, 42 + Math.random() * 26));
    }
  }

  function makeAsteroid(x, y, radius) {
    const speed = 0.6 + Math.random() * 1.4 + state.level * 0.08;
    const angle = Math.random() * Math.PI * 2;
    return {
      x, y, radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (Math.random() - 0.5) * 0.025,
      angle: Math.random() * Math.PI * 2,
      nodes: Array.from({ length: 10 }, () => 0.76 + Math.random() * 0.34)
    };
  }

  function wrap(obj) {
    if (obj.x < -40) obj.x = canvas.width + 40;
    if (obj.x > canvas.width + 40) obj.x = -40;
    if (obj.y < -40) obj.y = canvas.height + 40;
    if (obj.y > canvas.height + 40) obj.y = -40;
  }

  function fire() {
    if (state.ship.cooldown > 0 || state.over) return;
    state.ship.cooldown = 14;
    state.bullets.push({
      x: state.ship.x + Math.cos(state.ship.angle) * 18,
      y: state.ship.y + Math.sin(state.ship.angle) * 18,
      vx: state.ship.vx + Math.cos(state.ship.angle) * 7,
      vy: state.ship.vy + Math.sin(state.ship.angle) * 7,
      life: 58
    });
  }

  function burst(x, y, color = "#e31b23") {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 28 + Math.random() * 18, color });
    }
  }

  function damageShip() {
    if (state.ship.invulnerable > 0 || state.over) return;
    state.lives -= 1;
    burst(state.ship.x, state.ship.y, "#ffffff");
    if (state.lives <= 0) {
      state.over = true;
      return;
    }
    Object.assign(state.ship, { x: 480, y: 270, vx: 0, vy: 0, angle: -Math.PI / 2, cooldown: 0, invulnerable: 140 });
  }

  function restart() {
    Object.assign(state.ship, { x: 480, y: 270, vx: 0, vy: 0, angle: -Math.PI / 2, cooldown: 0, invulnerable: 120 });
    state.bullets = [];
    state.particles = [];
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.over = false;
    resetLevel();
  }

  function update() {
    state.frame += 1;
    if (keys.has("arrowleft") || keys.has("a")) state.ship.angle -= 0.075;
    if (keys.has("arrowright") || keys.has("d")) state.ship.angle += 0.075;
    if (keys.has("arrowup") || keys.has("w")) {
      state.ship.vx += Math.cos(state.ship.angle) * 0.16;
      state.ship.vy += Math.sin(state.ship.angle) * 0.16;
    }
    if (keys.has(" ")) fire();
    if (state.ship.cooldown > 0) state.ship.cooldown -= 1;
    if (state.ship.invulnerable > 0) state.ship.invulnerable -= 1;

    state.ship.x += state.ship.vx;
    state.ship.y += state.ship.vy;
    state.ship.vx *= 0.992;
    state.ship.vy *= 0.992;
    wrap(state.ship);

    state.bullets.forEach((bullet) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      bullet.life -= 1;
      wrap(bullet);
    });
    state.bullets = state.bullets.filter((bullet) => bullet.life > 0);

    state.asteroids.forEach((asteroid) => {
      asteroid.x += asteroid.vx;
      asteroid.y += asteroid.vy;
      asteroid.angle += asteroid.spin;
      wrap(asteroid);
    });

    state.particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 1;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);

    for (const bullet of [...state.bullets]) {
      for (const asteroid of [...state.asteroids]) {
        if (Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y) < asteroid.radius) {
          state.bullets.splice(state.bullets.indexOf(bullet), 1);
          splitAsteroid(asteroid);
          break;
        }
      }
    }

    for (const asteroid of state.asteroids) {
      if (Math.hypot(state.ship.x - asteroid.x, state.ship.y - asteroid.y) < asteroid.radius + 12) damageShip();
    }

    if (!state.over && state.asteroids.length === 0) {
      state.level += 1;
      resetLevel();
    }
  }

  function splitAsteroid(asteroid) {
    const index = state.asteroids.indexOf(asteroid);
    if (index >= 0) state.asteroids.splice(index, 1);
    state.score += Math.round(120 - asteroid.radius);
    burst(asteroid.x, asteroid.y);
    if (asteroid.radius > 24) {
      state.asteroids.push(makeAsteroid(asteroid.x, asteroid.y, asteroid.radius * 0.58));
      state.asteroids.push(makeAsteroid(asteroid.x, asteroid.y, asteroid.radius * 0.58));
    }
  }

  function drawShip() {
    const flicker = state.ship.invulnerable > 0 && Math.floor(state.frame / 6) % 2 === 0;
    if (flicker) return;
    ctx.save();
    ctx.translate(state.ship.x, state.ship.y);
    ctx.rotate(state.ship.angle);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-13, -10);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-13, 10);
    ctx.closePath();
    ctx.stroke();
    if (keys.has("arrowup") || keys.has("w")) {
      ctx.strokeStyle = "#e31b23";
      ctx.beginPath();
      ctx.moveTo(-12, -5);
      ctx.lineTo(-24 - Math.random() * 8, 0);
      ctx.lineTo(-12, 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAsteroid(asteroid) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.angle);
    ctx.strokeStyle = "#b9bac3";
    ctx.lineWidth = 2;
    ctx.beginPath();
    asteroid.nodes.forEach((node, index) => {
      const angle = index / asteroid.nodes.length * Math.PI * 2;
      const radius = asteroid.radius * node;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,.5)";
    for (let i = 0; i < 70; i++) {
      const x = (i * 137 + state.frame * 0.15) % canvas.width;
      const y = (i * 89) % canvas.height;
      ctx.fillRect(x, y, 1.4, 1.4);
    }

    state.asteroids.forEach(drawAsteroid);
    ctx.fillStyle = "#ffffff";
    state.bullets.forEach((bullet) => {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    state.particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life / 40);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, 3, 3);
      ctx.globalAlpha = 1;
    });
    drawShip();

    ctx.fillStyle = "#ffffff";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText(`Score ${state.score}`, 24, 34);
    ctx.fillText(`Lives ${state.lives}`, 24, 60);
    ctx.fillText(`Level ${state.level}`, 24, 86);
    if (state.over) {
      ctx.fillStyle = "rgba(0,0,0,.72)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "42px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Field Test Complete", canvas.width / 2, canvas.height / 2 - 18);
      ctx.font = "18px system-ui, sans-serif";
      ctx.fillText("Press Enter to run another trial", canvas.width / 2, canvas.height / 2 + 22);
      ctx.textAlign = "left";
    }
  }

  function loop() {
    if (!state.over) update();
    draw();
    state.raf = requestAnimationFrame(loop);
  }

  const keydown = (event) => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(key)) event.preventDefault();
    if (key === "enter" && state.over) restart();
    keys.add(key);
  };
  const keyup = (event) => keys.delete(event.key.toLowerCase());
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  resetLevel();
  loop();
  gameCleanup = () => {
    cancelAnimationFrame(state.raf);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
  };
}

function unitCards() {
  return unitOrder.map((unit) => {
    const meta = manifest.units[unit];
    return `
      <article class="card">
        <a class="title" href="#unit-${unit.split(" ")[1]}">${unit}: ${escapeHtml(meta.title)}</a>
        <p><strong>${escapeHtml(meta.weeks)}</strong></p>
        <p>${escapeHtml(meta.focus)}</p>
      </article>
    `;
  }).join("");
}

function newTeacherMode() {
  page("First Time User", "A simplified path through only the essentials for launching STARLAB without getting buried in the full curriculum archive.", `
    <section class="section">
      <div class="mode-banner">
        <strong>Focus on these first.</strong>
        <span>The complete portal is still available, but this page keeps the starting path intentionally narrow.</span>
      </div>
    </section>
    <section class="section">
      <h2>Essential First Opens</h2>
      <ul class="resource-link-list">
        ${toolkitLinks([
          ["Start Here Guide", "start here guide"],
          ["Course Operations Manual", "course operations manual"],
          ["Full Course Implementation Calendar", "full course implementation calendar"],
          ["Master Print Packet Index", "master print packet index"],
          ["Student Onboarding Packet", "student onboarding packet"],
          ["Grading and Assessment Guide", "grading assessment guide"]
        ])}
      </ul>
    </section>
    <section class="section">
      <h2>Launch Dashboard</h2>
      <div class="grid">
        <article class="card"><strong>Plan the course</strong><p>Start with pacing, operations, grading, and onboarding.</p><div class="actions"><a class="button" href="#start">Start Here</a></div></article>
        <article class="card"><strong>Teach Week 1</strong><p>Open the first week’s guide, deck, and student launch materials.</p><div class="actions"><a class="button" href="#week-1">Week 1 Materials</a></div></article>
        <article class="card"><strong>Prepare approval</strong><p>Understand how projects become safe, feasible, and ready to test.</p><div class="actions"><a class="button" href="#approval">Approval & Safety</a></div></article>
        <article class="card"><strong>Find a file</strong><p>Use the searchable index only when you need a specific resource.</p><div class="actions"><a class="button" href="#index">Resource Index</a></div></article>
      </div>
    </section>
    <section class="section">
      <h2>What To Ignore For Now</h2>
      <div class="grid">
        ${[
          ["Later units", "You do not need Unit 4 analysis or Unit 6 showcase materials during the first planning pass."],
          ["Every appendix", "Appendices are support tools. Open them when the weekly guide points you there."],
          ["Full resource index", "Use search when needed, but do not start by browsing all files."],
          ["Perfect mentor system", "Have a basic outreach plan now; refine mentor workflows once student projects take shape."]
        ].map(([title, body]) => `<article class="card"><strong>${title}</strong><p>${body}</p></article>`).join("")}
      </div>
    </section>
    <section class="section first-time-cta">
      <h2>Ready for the full launch path?</h2>
      <p>Use Start Here when you are ready to move from the essentials into the complete setup sequence.</p>
      <a class="button primary" href="#start">Go to Start Here</a>
    </section>
  `);
}

function startHere() {
  page("Start Here", "A guided launch path for teachers opening STARLAB for the first time.", `
    <section class="section">
      <div class="path-list">
        ${[
          ["1", "Understand the course", `Read the ${resourceLink("start here guide", "Start Here Guide")} and ${resourceLink("course operations manual", "Course Operations Manual")} to see the yearlong arc, teacher role, and classroom systems.`],
          ["2", "Set up pacing and printing", `Review the ${resourceLink("full course implementation calendar", "implementation calendar")} and ${resourceLink("master print packet index", "print packet index")} before making copies or calendar commitments.`],
          ["3", "Prepare the first two weeks", `Open <a href="#unit-1">Unit 1</a>, <a href="#week-1">Week 1 materials</a>, and the <a href="#slides">slide deck library</a> so the launch feels coherent.`],
          ["4", "Prepare approval systems", `Skim <a href="#approval">Project Approval & Safety</a>, the ${resourceLink("project approval tracker", "approval tracker")}, and the Unit 2 approval materials before students design projects.`],
          ["5", "Plan communication and support", `Prepare the ${resourceLink("student onboarding packet", "student onboarding packet")}, ${resourceLink("parent guardian communication pack", "parent/guardian pack")}, and <a href="#mentors">mentor workflow</a>.`]
        ].map(([step, title, detail]) => `
          <article class="path-step">
            <span>${step}</span>
            <div><h2>${title}</h2><p>${detail}</p></div>
          </article>
        `).join("")}
      </div>
    </section>
    <section class="section split">
      <div class="card">
        <h2>Before The Course Begins</h2>
        <ul class="list">
          <li>Confirm the yearlong pacing and major deliverables.</li>
          <li>Decide how students will store journals, data, drafts, and approvals.</li>
          <li>Prepare the first print packet and student onboarding materials.</li>
          <li>Identify likely mentor, safety, or showcase partners.</li>
        </ul>
      </div>
      <div class="card">
        <h2>First Two Weeks</h2>
        <ul class="list">
          <li>Establish STARLAB research culture and documentation norms.</li>
          <li>Use Unit 1 handouts to move from curiosity to researchable questions.</li>
          <li>Begin feasibility conversations before students become attached to unsafe or unworkable plans.</li>
          <li>Preview the approval process before Unit 2 begins.</li>
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

function formatDeckNumbers(numbers) {
  if (!numbers.length) return "";
  const labels = numbers.map((number) => `Deck ${number}`);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function deckUseSummary(mapping) {
  const primary = mapping?.primaryDecks || [];
  const secondary = mapping?.secondaryDecks || [];
  const parts = [];
  if (primary.length) parts.push(`Primary - ${formatDeckNumbers(primary)}`);
  if (secondary.length) parts.push(`Revisit / Reference - ${formatDeckNumbers(secondary)}`);
  if (!primary.length) parts.unshift("No New Deck");
  return parts.join("; ");
}

function weekPage(selectedWeek = 1) {
  const week = Number(selectedWeek) || 1;
  const mapping = courseWeek(week);
  const unit = mapping?.unit || unitForWeek(week);
  const items = resourcesForWeek(week);
  const teacherGuides = items.filter((item) => item.type === "Teacher Guide" || (item.type === "Document" && item.folder.includes("Teaching")));
  const primarySlides = resourcesByCatalogRefs((mapping?.primaryDecks || []).map((number) => `D${number}`));
  const secondarySlides = resourcesByCatalogRefs((mapping?.secondaryDecks || []).map((number) => `D${number}`));
  const requiredItems = resourcesByCatalogRefs(mapping?.required || []);
  const optionalItems = resourcesByCatalogRefs(mapping?.optional || []);
  const handouts = requiredItems.filter((item) => item.type === "Student Handout");
  const support = requiredItems.filter((item) => item.type !== "Student Handout");
  const requiredPrint = requiredItems.filter((item) => ["Student Handout", "Appendix", "Rubric"].includes(item.type));
  page("This Week's Materials", "Choose a course week and open the teacher guide, slides, handouts, appendices, and print-ready resources from one place.", `
    <section class="section card">
      <label class="field-label" for="week-select">Choose week</label>
      <select class="week-select" id="week-select">
        ${courseMap.weeks.map((item) => `<option value="${item.week}" ${item.week === week ? "selected" : ""}>Week ${item.week}: ${escapeHtml(item.focus)}</option>`).join("")}
      </select>
      <div class="meta"><span class="pill red">${escapeHtml(unit)}</span><span class="pill">${escapeHtml(manifest.units[unit]?.weeks || "")}</span></div>
      <div class="week-nav">
        ${week > 1 ? `<a class="button" href="#week-${week - 1}">Previous Week</a>` : `<span></span>`}
        ${week < 34 ? `<a class="button primary" href="#week-${week + 1}">Next Week</a>` : `<a class="button primary" href="#home">Return Home</a>`}
      </div>
    </section>
    <section class="section split">
      <div class="card">
        <h2>Week ${week} Focus</h2>
        <p>${escapeHtml(mapping?.focus || "See the implementation calendar for this week's focus.")}</p>
        <p><strong>Deck Use:</strong> ${escapeHtml(deckUseSummary(mapping))}</p>
        <p>${escapeHtml(mapping?.note || "Use the resources below to plan this week.")}</p>
        <ul class="list">
          <li>Open the teacher guide first${primarySlides.length || secondarySlides.length ? ", then preview the mapped deck use." : "."}</li>
          <li>Preview handouts before printing or sharing with students.</li>
          <li>Check support resources for rubrics, appendices, trackers, or safety tools.</li>
        </ul>
      </div>
      <div class="card">
        <h2>Required Weekly Materials</h2>
        <ul class="list">
          ${requiredPrint.map((item) => `<li>${previewLink(item)}</li>`).join("") || "<li>No new required materials this week. Students may continue using resources already issued.</li>"}
        </ul>
      </div>
    </section>
    <section class="section">
      <h2>Teacher Prep</h2>
      <div class="grid">
        ${[
          ["Open the teacher guide", teacherGuides.length ? `Start with ${teacherGuides.length} teacher-facing guide resource${teacherGuides.length === 1 ? "" : "s"} for this week.` : "No week-specific guide was inferred; use the unit overview and related resources."],
          ["Preview slides", primarySlides.length ? `Preview ${primarySlides.length} primary slide deck${primarySlides.length === 1 ? "" : "s"} before teaching.${secondarySlides.length ? ` Revisit ${secondarySlides.length} earlier deck${secondarySlides.length === 1 ? "" : "s"} as needed.` : ""}` : secondarySlides.length ? `No new core deck is assigned; revisit ${secondarySlides.length} earlier deck${secondarySlides.length === 1 ? "" : "s"} as needed.` : "No week-specific slide deck was mapped."],
          ["Print or share student materials", requiredPrint.length ? `${requiredPrint.length} required weekly material${requiredPrint.length === 1 ? "" : "s"} assigned.` : "No new required materials; students may continue using resources already issued."],
          ["Check support needs", optionalItems.length ? "Review the optional and teacher-reference resources before class." : "No additional optional resources are mapped for this week."]
        ].map(([title, detail]) => `<article class="card"><strong>${title}</strong><p>${escapeHtml(detail)}</p></article>`).join("")}
      </div>
    </section>
    ${weekSection("Teacher Guide", teacherGuides)}
    ${primarySlides.length ? weekSection("Primary Slide Decks", primarySlides) : `
      <section class="section">
        <h2>No New Deck</h2>
        <p>${secondarySlides.length ? "Use the earlier deck below only as a targeted revisit or reference." : "This week is intentionally organized around work sessions, checkpoints, or the public showcase."}</p>
      </section>
    `}
    ${secondarySlides.length ? weekSection("Revisit / Reference Decks", secondarySlides) : ""}
    ${weekSection("Student Handouts", handouts)}
    ${weekSection("Required Appendices and Rubrics", support)}
    ${weekSection("Optional / Teacher Reference", optionalItems)}
  `);
  document.querySelector("#week-select")?.addEventListener("change", (event) => {
    location.hash = `#week-${event.target.value}`;
  });
}

function weekSection(title, items) {
  return `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      <div class="grid">${items.length ? items.map(card).join("") : `<p>No ${escapeHtml(title.toLowerCase())} found for this week.</p>`}</div>
    </section>
  `;
}

function unitDetail(number) {
  const unit = `Unit ${number}`;
  const meta = manifest.units[unit];
  if (!meta) return unitsPage();
  const deckList = manifest.decks.filter((deck) => deck.unit === unit);
  const buckets = ["Teacher Guide", "Student Handout", "Appendix", "Rubric"].map((type) => [type, resources({ unit, type })]);
  const weeks = unitWeeks[unit] || [];
  const printItems = unitPrintItems(unit);
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
    <section class="section">
      <h2>Week-by-Week Teaching Path</h2>
      <div class="week-grid">
        ${weeks.map((week) => `
          <a class="week-card" href="#week-${week}">
            <strong>Week ${week}</strong>
            <span>${escapeHtml(courseWeek(week)?.focus || "See the implementation calendar for this week's focus.")}</span>
          </a>
        `).join("")}
      </div>
    </section>
    <section class="section split">
      <div class="card">
        <h2>Teacher Prep Checklist</h2>
        <ul class="list">
          <li>Open the unit overview and first weekly guide before planning lessons.</li>
          <li>Preview associated slide decks and decide what students need printed.</li>
          <li>Identify the unit's major deliverables and assessment evidence.</li>
          <li>Check for safety, approval, mentor, or showcase needs before they become urgent.</li>
        </ul>
      </div>
      <div class="card">
        <h2>Print Checklist</h2>
        <ul class="list scroll-list">
          ${printItems.required.map((item) => `<li>${previewLink(item)}</li>`).join("") || "<li>No required student copies found for this unit.</li>"}
          ${printItems.optional.length ? `<li class="list-divider"><strong>Optional / Teacher Reference</strong></li>${printItems.optional.map((item) => `<li>${previewLink(item)}</li>`).join("")}` : ""}
        </ul>
      </div>
    </section>
    ${buckets.map(([type, items]) => `
      <section class="section">
        <h2>${resourceTypeHeading(type)}</h2>
        <div class="grid">${items.length ? items.map(card).join("") : `<p>No ${type.toLowerCase()} resources found in the manifest.</p>`}</div>
      </section>
    `).join("")}
  `);
}

function unitPrintItems(unit) {
  const mappings = courseMap.weeks.filter((item) => item.unit === unit);
  const sortItems = (items) => [...new Map(items.map((item) => [item.id, item])).values()].sort((a, b) => {
    const rank = (item) => item.type === "Student Handout" || item.folder.includes("Student") ? 0 : item.type === "Rubric" ? 1 : 2;
    return rank(a) - rank(b) || a.title.localeCompare(b.title, undefined, { numeric: true });
  });
  return {
    required: sortItems(resourcesByCatalogRefs(mappings.flatMap((item) => item.required))),
    optional: sortItems(resourcesByCatalogRefs(mappings.flatMap((item) => item.optional)))
  };
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
      ["Start Here Guide", "start here guide"],
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
      ["Parent/Guardian Communication Pack (For Teacher Distribution)", "parent guardian communication pack"]
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
      <p class="section-note">Unit-level percentage tables are optional local suggestions for breaking down work within a unit. They do not replace these six official syllabus categories or add a seventh course category.</p>
    </section>

    <section class="section">
      <h2>How Unit Scores Enter the Gradebook</h2>
      <p class="section-note">Use the percentages in each unit overview only to choose local point values and balance evidence within that unit. Enter each score in the official syllabus category shown below.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Unit</th>
              <th>Evidence Collected</th>
              <th>Official Gradebook Category</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unit 1</td>
              <td>Research identity, ethics, experimental-design practice, topic development, question evaluation, and preliminary pitch</td>
              <td>Project Proposal</td>
            </tr>
            <tr>
              <td>Unit 2</td>
              <td>Background research, hypothesis or criteria, procedure, data plan, safety and ethics screening, timeline, and formal research plan</td>
              <td>Project Proposal</td>
            </tr>
            <tr>
              <td rowspan="3">Unit 3</td>
              <td>Journals, pilot reflections, revised procedures, troubleshooting records, and weekly check-ins</td>
              <td>Research Journal / Documentation</td>
            </tr>
            <tr>
              <td>Data-collection system and preserved raw data</td>
              <td>Data Analysis and Interpretation</td>
            </tr>
            <tr>
              <td>Mid-project progress report</td>
              <td>Mid-Project Progress Report</td>
            </tr>
            <tr>
              <td>Unit 4</td>
              <td>Clean data, analysis plan, calculations, graphs, uncertainty, limitations, interpretation, and analysis summary</td>
              <td>Data Analysis and Interpretation</td>
            </tr>
            <tr>
              <td rowspan="2">Unit 5</td>
              <td>Report drafts, peer review, revision, and final scientific report</td>
              <td>Final Research Report</td>
            </tr>
            <tr>
              <td>Visual aid, presentation planning, practice, and reflection</td>
              <td>Oral Presentation</td>
            </tr>
            <tr>
              <td rowspan="2">Unit 6</td>
              <td>Presentation product, delivery, Q&amp;A, showcase professionalism, and final presentation reflection</td>
              <td>Oral Presentation</td>
            </tr>
            <tr>
              <td>Portfolio evidence and optional next-step planning, when scored</td>
              <td>Research Journal / Documentation</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="section-note">If the final research report is completed during Unit 6, record it under Final Research Report. Do not create a separate unit category or score the same report twice.</p>
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
      <p><strong>Official presentation instruments:</strong> Unit 6 Appendix L is the final summative Oral Presentation rubric. Unit 6 Appendix M scores the public showcase presentation within that same syllabus category.</p>
      <ul class="resource-link-list">${toolkitLinks(toolkit)}</ul>
    </section>
  `);
}

const curatedAliases = {
  "start here guide": "startHereGuide",
  "course operations manual": "courseOperations",
  "full course implementation calendar": "implementationCalendar",
  "master print packet index": "masterPrintIndex",
  "student onboarding packet": "studentOnboarding",
  "grading assessment guide": "gradingGuide",
  "grading and assessment guide": "gradingGuide",
  "starlab syllabus": "syllabus",
  "course proposal": "courseProposal",
  "project approval system": "approvalSystem",
  "starlab project approval system": "approvalSystem",
  "project approval tracker": "approvalTracker",
  "safety scope guide": "safetyScopeGuide",
  "ai use policy": "aiPolicy",
  "mentor community partner toolkit": "mentorToolkit",
  "parent guardian communication pack": "parentPack",
  "sample student project library": "sampleLibrary",
  "common problems what to do guide": "commonProblems",
  "how to plan schedule starlab project": "projectScheduleGuide",
  "weekly progress tracker student guide": "weeklyProgressStudentGuide",
  "weekly progress tracker": "weeklyProgressTracker",
  "showcase planning kit": "showcasePlanningKit",
  "risk assessment matrix": "riskAssessmentMatrix",
  "safety ethics red flags": "safetyRedFlags",
  "project approval checklist": "projectApprovalChecklist",
  "safety risk assessment": "safetyRiskHandout",
  "ethics approval screening": "ethicsScreeningHandout",
  "formal research plan safety ethics approval": "week4Guide",
  "research journal standards": "researchJournalStandards",
  "journal self assessment": "researchJournalSelfAssessment",
  "progress report rubric": "progressReportRubric",
  "unit 4 analysis rubric": "analysisRubric",
  "scientific report rubric": "scientificReportRubric",
  "oral presentation rubric": "oralPresentationRubric",
  "showcase rubric": "showcaseRubric",
  "showcase planning guide for teachers": "showcaseTeacherGuide",
  "sample showcase schedule": "sampleShowcaseSchedule",
  "visitor question guide": "visitorQuestionGuide",
  "final showcase readiness checklist": "finalShowcaseChecklist",
  "audience feedback collection form": "audienceFeedback",
  "presentation product final check": "presentationProductCheck",
  "post presentation reflection": "postPresentationReflection",
  "portfolio checklist": "portfolioChecklist",
  "mentor feedback request template": "mentorFeedbackRequest",
  "mentor communication guidelines": "mentorCommunication",
  "teacher conference guide": "teacherConferenceGuide",
  "research plan conference form": "researchPlanConference",
  "teacher data check conference prompts": "dataCheckPrompts",
  "midpoint conference questions": "midpointConference",
  "conference questions interpretation": "interpretationConference",
  "audience types communication strategies": "audienceTypes",
  "formal research plan template": "formalResearchPlanTemplate",
  "project timeline planner": "projectTimelinePlanner",
  "data collection plan": "dataCollectionPlan",
  "data analysis plan": "dataAnalysisPlan",
  "scientific report template": "scientificReportTemplate",
  "full report checklist": "fullReportChecklist",
  "presentation planning guide": "presentationPlanner"
};

function curatedResource(keyOrAlias) {
  const key = courseMap.curatedResources[keyOrAlias] ? keyOrAlias : curatedAliases[normalize(keyOrAlias)];
  const path = key ? courseMap.curatedResources[key] : "";
  return path ? manifest.resources.find((item) => item.path === path) : null;
}

function approvalResourceLinks() {
  const links = [
    ["Project Approval System", "approvalSystem"],
    ["Project Approval Tracker - Official Approval Record", "approvalTracker"],
    ["Safety Scope Guide by Project Type", "safetyScopeGuide"],
    ["Risk Assessment Matrix", "riskAssessmentMatrix"],
    ["Safety and Ethics Red Flags", "safetyRedFlags"],
    ["Project Approval Checklist", "projectApprovalChecklist"],
    ["Safety and Risk Assessment Handout", "safetyRiskHandout"],
    ["Ethics and Approval Screening Handout", "ethicsScreeningHandout"],
    ["Week 4 Teacher Guide", "week4Guide"]
  ];
  return links.map(([label, key]) => {
    const item = curatedResource(key);
    return item ? `<li>${previewLink(item, label)}<span>${escapeHtml(item.unit)} · ${escapeHtml(item.type)}</span></li>` : "";
  }).join("");
}

function approvalPage() {
  page("Project Approval & Safety", "A decision-support workflow for approving, pausing, redirecting, or escalating student research projects before testing begins.", `
    <section class="section">
      <div class="mode-banner"><strong>The Project Approval Tracker is the official approval record.</strong><span>The Safety Scope Guide and screening resources help teachers complete that tracker. Any additional consent, media, fieldwork, equipment, chemical, drone, human-participant, or data-privacy forms are supplied by the district.</span></div>
    </section>
    <section class="section split">
      <div class="card">
        <h2>Approval Workflow</h2>
        <ol class="decision-list">
          <li><strong>Define the project.</strong><span>Student names the research question, hypothesis or design criteria, variables, materials, procedure, and intended data.</span></li>
          <li><strong>Screen for safety and ethics.</strong><span>Use the risk assessment, ethics screening, red flags, and safety scope guide before any testing.</span></li>
          <li><strong>Check feasibility.</strong><span>Confirm time, materials, supervision, sample size, data quality, and whether the plan can be done in school conditions.</span></li>
          <li><strong>Choose an official tracker status.</strong><span>Use the exact status options in the Project Approval Tracker.</span></li>
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
      <div class="mode-banner"><strong>Workflow-only tracker states do not grant permission.</strong><span>Not Started, Idea Screening, Planning In Progress, Ready for Conference, Paused, and Completed organize project progress but never authorize testing or data collection.</span></div>
      <div class="grid">
        ${[
          ["Approved for Pilot Testing", "The plan is clear, feasible, and appropriately safe for small-scale testing."],
          ["Approved With Modifications", "The project may advance only after named changes are completed and verified; this status does not by itself authorize testing."],
          ["Needs Revision", "The plan is incomplete, unclear, or not yet testable."],
          ["Needs Safety Review", "More safety information, supervision, or district guidance is required."],
          ["Needs Ethics Review", "The project raises human-participant, privacy, animal, biological, medical, or other ethics concerns."],
          ["Needs Mentor Review", "A content expert should review technical feasibility, specialized procedures, or interpretation risks."],
          ["Not Approved in Current Form", "The project cannot proceed as written and needs a safer or more feasible redesign."],
          ["Approved for Systematic Data Collection", "Pilot evidence supports the revised method and the project may move into full data collection."]
        ].map(([status, meaning]) => `<article class="card"><strong>${status}</strong><p>${meaning}</p></article>`).join("")}
      </div>
      <div class="mode-banner"><strong>Permission rule</strong><span>Only Approved for Pilot Testing permits the approved small-scale pilot. Only Approved for Systematic Data Collection permits full data collection. All other statuses require continued planning, review, revision, verification, or pause.</span></div>
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
  return entries.map(([label, keyOrAlias]) => {
    const item = curatedResource(keyOrAlias);
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
  page("Showcase Planning", "A practical planning hub for preparing every student to present STARLAB research to a genuine public audience.", `
    <section class="section">
      <div class="mode-banner"><strong>A public presentation is required.</strong><span>The venue may be a university poster session, science fair, district event, community presentation, or another authentic public forum. A classroom-only presentation does not satisfy Unit 6.</span></div>
    </section>
    <section class="section split">
      <div class="card">
        <h2>Showcase Timeline</h2>
        <ol class="decision-list">
          <li><strong>Week 21: Set the event.</strong><span>Confirm the public format, target date, audience, space, and district support six to eight weeks ahead.</span></li>
          <li><strong>Week 24: Confirm the audience.</strong><span>Send invitations or confirm the public event, communication plan, and visitor pathway.</span></li>
          <li><strong>Week 27: Lock logistics.</strong><span>Finalize technology, accessibility, schedule, room flow, and assessment workflow.</span></li>
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
          <li>Who is the public audience: families, mentors, administrators, community visitors, university guests, or judges?</li>
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
      <p>Use Unit 6 Appendix L as the final summative oral presentation rubric. Use Unit 6 Appendix M to score the public showcase presentation. The Showcase Planning Kit is a teacher readiness guide, not a competing rubric.</p>
      <ul class="resource-link-list">${toolkitLinks(toolkit)}</ul>
    </section>
  `);
}

function mentorsPage() {
  const toolkit = [
    ["Mentor and Community Partner Toolkit", "mentor community partner toolkit"],
    ["Parent/Guardian Communication Pack (For Teacher Distribution)", "parent guardian communication pack"],
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
      <div class="view-toggle" role="group" aria-label="Resource index view">
        <button class="button primary" type="button" data-view="table">Table View</button>
        <button class="button" type="button" data-view="cards">Card View</button>
      </div>
      <section class="section" id="results"></section>
    </section>
  `;
  const form = document.querySelector("#filters");
  let view = "table";
  const render = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    const items = resources(data);
    document.querySelector("#results").innerHTML = `
      <h2>${items.length} Resources</h2>
      ${view === "cards" ? `<div class="grid">${items.map(card).join("")}</div>` : `<div class="table-wrap">
        <table>
          <thead><tr><th>Resource Name</th><th>Unit</th><th>Type</th><th>Audience</th><th>When Used</th><th>Related Deck</th><th>File Location</th><th>Tags</th></tr></thead>
          <tbody>${items.map((item) => `
            <tr>
              <td>${previewLink(item)}<br>${escapeHtml(item.purpose || item.description)}</td>
              <td>${escapeHtml(item.unit)}</td>
              <td>${escapeHtml(item.type)}</td>
              <td>${escapeHtml(item.audience)}</td>
              <td>${escapeHtml(item.whenUsed || "TBD")}</td>
              <td>${escapeHtml(item.relatedDeck || "TBD")}</td>
              <td>${escapeHtml(item.folder)}</td>
              <td>${[...(item.keywords || []), ...(item.tags || [])].slice(0, 8).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join(" ")}</td>
            </tr>`).join("")}</tbody>
        </table>
      </div>`}
    `;
  };
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      view = button.dataset.view;
      document.querySelectorAll("[data-view]").forEach((control) => control.classList.toggle("primary", control === button));
      render();
    });
  });
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
  cleanupGame();
  nav.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
  const hash = location.hash.replace("#", "") || "home";
  if (hash === "asteroids") asteroidsPage();
  else if (hash === "home") home();
  else if (hash === "about") aboutPage();
  else if (hash === "new-teacher") newTeacherMode();
  else if (hash === "start") startHere();
  else if (hash === "week") weekPage(1);
  else if (hash.startsWith("week-")) weekPage(hash.split("-")[1]);
  else if (hash === "units") unitsPage();
  else if (hash.startsWith("unit-")) unitDetail(hash.split("-")[1]);
  else if (hash === "slides") slides();
  else if (hash === "handouts") library("Handout Library", "Student-facing handouts organized by unit and searchable from the master index.", { type: "Student Handout" });
  else if (hash === "appendixes") library("Appendix Library", "Supplemental appendices, rubrics, checklists, and implementation references.", { type: "Appendix" });
  else if (hash === "teacher") teacherResources();
  else if (["assessment", "approval", "mentors", "showcase", "templates"].includes(hash)) topicPage(hash);
  else if (hash === "index") indexPage();
  else home();
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

Promise.all([
  fetch("data/resources.json?v=20260716-7").then((response) => response.json()),
  fetch("data/course-map.json?v=20260716-7").then((response) => response.json())
])
  .then(([resourceData, courseData]) => {
    manifest = resourceData;
    courseMap = courseData;
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
  const primaryActionLabel = officeFile(item) ? `Download Editable ${escapeHtml(item.extension)}` : "Open / Download File";
  document.body.insertAdjacentHTML("beforeend", `
    <div class="preview-backdrop" role="presentation" data-close-preview></div>
    <section class="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <button class="preview-close" type="button" data-close-preview aria-label="Close preview">Close</button>
      <div class="preview-header">
        <p class="eyebrow">${escapeHtml(item.type)} · ${escapeHtml(item.unit)}</p>
        <h2 id="preview-title">${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.purpose || item.description)}</p>
        <div class="meta">
          <span class="pill red">${escapeHtml(item.extension)}</span>
          <span class="pill">${escapeHtml(item.sizeLabel)}</span>
          ${item.whenUsed ? `<span class="pill">${escapeHtml(item.whenUsed)}</span>` : ""}
          ${item.relatedDeck ? `<span class="pill">${escapeHtml(item.relatedDeck)}</span>` : ""}
        </div>
      </div>
      <div class="preview-body">${previewContent(item)}</div>
      <div class="preview-actions">
        <a class="button primary" href="${item.href}" target="_blank" rel="noopener">${primaryActionLabel}</a>
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
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return `<img class="preview-media" src="${item.href}" alt="${escapeHtml(item.title)} preview">`;
  }
  if (ext === "mp4") {
    return `<video class="preview-media" controls preload="metadata" src="${item.href}"></video>`;
  }
  if (["pdf", "txt", "md"].includes(ext)) {
    return `<iframe class="preview-frame" src="${item.href}" title="${escapeHtml(item.title)} preview"></iframe>`;
  }
  if (officeFile(item)) {
    const publicUrl = publicResourceUrl(item);
    const viewerUrl = publicUrl ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicUrl)}` : "";
    const previewHelp = viewerUrl
      ? "Microsoft's online preview sometimes fails with GitHub Pages-hosted Office files. The document is still available; use the buttons below if the preview service cannot open it."
      : "Office previews need a publicly reachable HTTPS file URL. This local preview address cannot be reached by Microsoft's online viewer.";
    const viewerLink = viewerUrl
      ? `<a class="button" href="${viewerUrl}" target="_blank" rel="noopener">Try Microsoft Preview</a>`
      : "";
    return `
      <div class="preview-unavailable office-preview-card">
        <h3>Office Document Preview</h3>
        <p>${escapeHtml(previewHelp)}</p>
        <div class="office-preview-actions">
          ${viewerLink}
          <a class="button primary" href="${item.href}" target="_blank" rel="noopener">Download Editable ${escapeHtml(item.extension)}</a>
        </div>
        <p><strong>Best teacher workflow:</strong> download the editable file, then open it in Word, PowerPoint, Excel, or Google Drive.</p>
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

function officeFile(item) {
  const officeExts = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];
  return officeExts.includes(item.extension.toLowerCase());
}

function publicResourceUrl(item) {
  if (location.protocol !== "https:" && location.hostname !== "localhost") return "";
  const localHosts = ["localhost", "127.0.0.1", "::1"];
  if (localHosts.includes(location.hostname)) return "";
  return new URL(item.href, location.href).href;
}
