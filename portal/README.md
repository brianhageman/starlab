# STARLAB Curriculum Portal

This folder contains a lightweight teacher-facing portal for the STARLAB curriculum package. It is built as a static site that reads from a generated resource manifest instead of hard-coded file lists.

## Run locally

From the curriculum root:

```bash
node portal/tools/generate-manifest.mjs
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/portal/
```

## Update the resource index

Add new files to the existing curriculum folders, then rerun:

```bash
node portal/tools/generate-manifest.mjs
```

The generator scans the curriculum root, skips hidden files, portal source files, and PD working files, then writes `portal/data/resources.json`.

Metadata lives in:

```text
portal/data/resource-metadata.json
```

That file adds teacher-friendly purposes, keywords, required/optional flags, print guidance, and usage notes. If you add many new resources, run:

```bash
node portal/tools/generate-metadata.mjs
node portal/tools/generate-manifest.mjs
```

Recommended locations:

- Slide decks: `STARLAB_Slide_Decks_All/`
- Student handouts: the relevant unit's `Student Handouts/` or `Student_Handouts/` folder
- Teaching guides: the relevant unit's `Teaching Guides/` or `Teaching_Guides/` folder
- Appendix materials: the relevant unit's `Appendixes/` folder
- Coursewide teacher resources: `Teacher Resources (Start Here)/`

## Deploy

Deploy the curriculum root as a static site and use `/portal/` as the entry point. This works on GitHub Pages, Netlify, Vercel, or any static web host as long as the curriculum files remain in the same relative folder structure.

For Office document previews, the deployed site must use a public HTTPS URL. Local addresses such as `127.0.0.1` cannot be reached by Microsoft Office Viewer, so Word, PowerPoint, and Excel files show a local fallback message during development. Once deployed publicly, the portal embeds Office files through Microsoft Office Viewer before teachers choose to open or download them.

## Branding assets

The portal references the existing root-level files:

- `STARLAB Logo 2026.png`
- `STARLAB 2026-27.mp4`

The files are not copied or renamed.

## Assumptions and limitations

- Original curriculum files are not moved or renamed.
- Metadata such as audience, tags, week, and resource type is inferred from folder and file names.
- The manifest is easy to edit by hand if a resource needs richer descriptions later.
- File previews depend on the browser and operating system; the portal links directly to each file.
- Public Office previews depend on Microsoft Office Viewer and require publicly accessible file URLs.
