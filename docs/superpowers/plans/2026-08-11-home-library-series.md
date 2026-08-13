# Home Fixed Viewport and Curriculum Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long Home shelves with three numbered curriculum covers, keep desktop Home within one viewport, and add reusable series pages where books expand to reveal lessons.

**Architecture:** Add a single catalog configuration module for the three curriculum series and reuse it in Home plus a new `/thu-vien/[series]` route. Keep published TOPIK data connected through `buildTopikShelf()`, represent series 2 and 3 as locked static definitions, and isolate interactive book expansion in a small client component.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Preserve the existing published lesson, authentication, progress, streak, exam, and account flows.
- Preserve legacy routes `/tieng-han-th` and `/courses/[courseSlug]`.
- Home covers contain only numbers `1`, `2`, `3`; they do not display series names or the word `TOPIK`.
- Series book counts are exactly `6`, `6`, and `8`.
- Desktop Home targets a fixed viewport; mobile remains vertically scrollable.
- Do not change the Supabase schema.

---

### Task 1: Curriculum series catalog

**Files:**
- Create: `lib/catalog/curriculum-series.ts`
- Create: `lib/catalog/curriculum-series.test.ts`

**Interfaces:**
- Produces: `CurriculumSeriesId`, `CurriculumSeriesDefinition`, `curriculumSeriesDefinitions`, `getCurriculumSeries(seriesId)`.
- Consumes: none.

- [ ] **Step 1: Write the failing catalog test**

Test that definitions use IDs `1`, `2`, `3`, counts `6`, `6`, `8`, themes `blue`, `cyan`, `green`, and reject unknown IDs.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- lib/catalog/curriculum-series.test.ts`

Expected: FAIL because `curriculum-series.ts` does not exist.

- [ ] **Step 3: Implement the catalog**

Export immutable definitions with exact IDs, book counts, theme tokens, cover assets, and route paths `/thu-vien/1`, `/thu-vien/2`, `/thu-vien/3`. Implement a narrow lookup that returns `undefined` for unsupported input.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- lib/catalog/curriculum-series.test.ts`

Expected: PASS.

### Task 2: Reusable curriculum covers and Home library summary

**Files:**
- Create: `features/library/curriculum-series-cover.tsx`
- Create: `features/library/curriculum-series-cover.test.tsx`
- Modify: `features/home/home-client.tsx`
- Modify: `features/home/home-sidebar-layout.test.ts`

**Interfaces:**
- Consumes: `CurriculumSeriesDefinition` and `curriculumSeriesDefinitions` from Task 1.
- Produces: `CurriculumSeriesCover({ series, priority?, compact? })`.

- [ ] **Step 1: Write failing cover and Home structure tests**

Verify each cover renders only its numeric ID as visible cover copy, uses the configured theme/asset, and links to its series route. Extend the sidebar regression test to require a bold `/thu-vien` link and ensure the old expandable `SidebarLibrary` is absent. Add source-level assertions that Home maps exactly the three series definitions and no longer renders the 6/6/8 shelves inline.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- features/library/curriculum-series-cover.test.tsx features/home/home-sidebar-layout.test.ts`

Expected: FAIL because the cover component and new Home structure do not exist.

- [ ] **Step 3: Implement the shared cover**

Create an accessible full-cover `Link` with `aria-label="Mở bộ {id}"`, series-specific gradient, optional existing cover asset, a spine, subtle pattern, and one large numeric ID. Do not render series title text or `TOPIK`.

- [ ] **Step 4: Replace Home shelf UI**

Remove `SidebarLibrary`, `BookCover`, `UpcomingBookCover`, shelf-only state, and the long book shelves. Replace the sidebar library button with a bold `Link href="/thu-vien"`. Replace the Home library section with a compact heading plus a three-column grid of `CurriculumSeriesCover` components.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test -- features/library/curriculum-series-cover.test.tsx features/home/home-sidebar-layout.test.ts`

Expected: PASS.

### Task 3: Series accordion and library routes

**Files:**
- Create: `features/library/curriculum-series-library.tsx`
- Create: `features/library/curriculum-series-library.test.tsx`
- Create: `app/thu-vien/page.tsx`
- Create: `app/thu-vien/[series]/page.tsx`
- Create: `app/thu-vien/[series]/loading.tsx`

**Interfaces:**
- Consumes: `CurriculumSeriesDefinition`, `CourseSummary`, and TOPIK shelf items.
- Produces: `CurriculumSeriesLibrary({ series, books })` where each book includes number, status, optional course slug, and lesson summaries.

- [ ] **Step 1: Write failing accordion behavior tests**

Render the client component with two published books and one locked book. Verify all rows render, selecting one published book expands its lessons, selecting another closes the first, selecting the open book collapses it, learner links use existing course lesson routes, and a locked book cannot expose links.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- features/library/curriculum-series-library.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the accordion**

Use one `expandedBookNumber` state, semantic buttons with `aria-expanded`, stable lesson links, visible locked/empty states, and series theme classes. Do not duplicate course/progress logic.

- [ ] **Step 4: Implement `/thu-vien`**

Load published course shells once, show the three series covers, and include a Home back link. The route is the canonical destination for the sidebar library item.

- [ ] **Step 5: Implement `/thu-vien/[series]`**

Validate `params.series` with `getCurriculumSeries()`, call `notFound()` for invalid IDs, load published course shells, map series 1 through `buildTopikShelf()`, and generate locked book rows for series 2 and 3. Add `loading.tsx` so dynamic navigation provides immediate visual feedback according to the local Next.js routing guide.

- [ ] **Step 6: Run tests and verify GREEN**

Run: `npm test -- features/library/curriculum-series-library.test.tsx lib/catalog/curriculum-series.test.ts`

Expected: PASS.

### Task 4: Fixed desktop Home viewport and responsive safety

**Files:**
- Modify: `features/home/home-client.tsx`
- Modify: `app/globals.css`
- Create: `features/home/home-viewport-layout.test.ts`

**Interfaces:**
- Consumes: the compact Home structure from Task 2.
- Produces: desktop-only viewport layout classes and mobile overflow fallback.

- [ ] **Step 1: Write the failing layout regression test**

Assert that Home uses a desktop viewport wrapper, desktop main content has constrained height/overflow, the three-cover grid is present, and the default/mobile layout retains vertical scrolling.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- features/home/home-viewport-layout.test.ts`

Expected: FAIL because the viewport classes do not exist.

- [ ] **Step 3: Implement desktop-only fixed layout**

Use CSS media queries at `lg` and a minimum-height safety query. At normal desktop heights, set Home to `100dvh`, keep the sidebar fixed, constrain main content, reduce vertical gaps/card heights, and suppress page scrolling. For mobile and short desktop viewports, preserve `overflow-y:auto` so content is never inaccessible.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- features/home/home-viewport-layout.test.ts`

Expected: PASS.

### Task 5: Full verification and handoff

**Files:**
- Review all modified files.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: verified implementation ready for user review.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- lib/catalog/curriculum-series.test.ts features/library/curriculum-series-cover.test.tsx features/library/curriculum-series-library.test.tsx features/home/home-sidebar-layout.test.ts features/home/home-viewport-layout.test.ts`

- [ ] **Step 2: Run lint and typecheck**

Run: `npm run lint`

Run: `npm run typecheck`

- [ ] **Step 3: Run production build**

Run: `npm run build`

- [ ] **Step 4: Inspect repository changes**

Run: `git status --short --branch`

Run: `git diff --check`

Confirm only the approved Home/library work plus the previously preserved sidebar changes are present. Do not push or create a production PR without a separate explicit request.
