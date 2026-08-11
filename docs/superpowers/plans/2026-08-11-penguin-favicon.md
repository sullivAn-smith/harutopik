# Penguin Favicon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the browser tab and saved-site icons with a close-up crop of the supplied Harutopik penguin mascot.

**Architecture:** Use Next.js file-based metadata so the framework emits the correct icon links automatically. Generate a tight square crop centered on the mascot's face and glasses, then export browser and Apple icon sizes without changing page metadata or the Open Graph image.

**Tech Stack:** Next.js 16 App Router metadata files, PNG/ICO image assets, macOS image tooling.

## Global Constraints

- Preserve all unrelated repository changes.
- Keep the supplied mascot artwork unchanged apart from cropping and resizing.
- Do not change the in-page logo, manifest icon, or Open Graph image.
- Keep a white background so the icon remains clean on light and dark browser chrome.

---

### Task 1: Generate and verify the mascot icon set

**Files:**
- Modify: `app/favicon.ico`
- Create: `app/icon.png`
- Create: `app/apple-icon.png`

**Interfaces:**
- Consumes: `/var/folders/s2/vxw_hd6j3pjdcm8qwnmgsgpw0000gn/T/codex-clipboard-61aaaceb-df27-46b4-89fb-5e97952ebe3c.png`
- Produces: Next.js file-based favicon, general icon, and Apple touch icon metadata assets.

- [ ] **Step 1: Create a square face crop**

  Crop around the mascot's face, glasses, and beak so the identifying features fill the frame at favicon size.

- [ ] **Step 2: Export the metadata assets**

  Export `app/favicon.ico`, `app/icon.png`, and `app/apple-icon.png` using the same crop at appropriate resolutions.

- [ ] **Step 3: Inspect dimensions and visual framing**

  Confirm the PNG dimensions, ICO readability, white background, and that no glasses or beak edges are clipped.

- [ ] **Step 4: Run production verification**

  Run `npm run build` and confirm Next.js recognizes the file-based metadata without route conflicts.

