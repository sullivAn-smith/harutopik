# TOPIK I Exam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete TOPIK I attempt with Listening then Reading, per-question locked audio, staff media/import workflows, admin review/hotfix, window-leave monitoring, and sectioned results.

**Architecture:** Extend the existing exam tables additively and keep one immutable question snapshot per attempt. Server routes own section transitions, audio-play consumption, answer persistence, monitoring events, and scoring; client components render the server-authorized state. Published hotfixes update the live exam version while attempts already started continue using their snapshot.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, Supabase PostgreSQL/RLS/Storage, Azure Speech, Vitest, Testing Library, Playwright.

## Global Constraints

- TOPIK I only: Listening followed by Reading.
- Listening audio is one file per question and may be uploaded or generated with Azure Speech.
- Learner starts audio explicitly; it cannot be paused, seeked, or replayed after the server consumes the single play.
- Listening locks completed questions; Reading permits free navigation and review flags.
- Existing attempts retain their snapshot after a published exam hotfix.
- Do not overwrite or delete existing user changes.
- Read the relevant local Next.js 16 documentation before modifying App Router code.
- All authorization remains enforced in both application code and PostgreSQL RLS/RPC.

---

### Task 1: Domain types and validation

**Files:**
- Modify: `lib/exams/types.ts`
- Modify: `lib/exams/types.test.ts`
- Create: `lib/exams/attempt-state.ts`
- Create: `lib/exams/attempt-state.test.ts`

**Interfaces:**
- Produces: `ExamSection`, `ExamQuestionInput`, `ExamDraftInput`, `AttemptSection`, `canAccessQuestion()`, `scoreAttemptSnapshot()`.
- Consumes: Zod 4 and existing exam schemas.

- [ ] **Step 1: Write failing schema tests**

```ts
it("requires audio only for listening questions", () => {
  expect(examQuestionSchema.safeParse({ ...baseQuestion, section: "listening", audioUrl: "" }).success).toBe(false);
  expect(examQuestionSchema.safeParse({ ...baseQuestion, section: "reading", audioUrl: "" }).success).toBe(true);
});

it("requires both TOPIK I sections", () => {
  expect(examDraftSchema.safeParse({ ...baseDraft, questions: [listeningQuestion] }).success).toBe(false);
});
```

- [ ] **Step 2: Run `npm test -- lib/exams/types.test.ts` and confirm failure**
- [ ] **Step 3: Add discriminated question validation and two section durations**

```ts
export const examSectionSchema = z.enum(["listening", "reading"]);
export type ExamSection = z.infer<typeof examSectionSchema>;

export const examQuestionSchema = baseQuestionSchema.superRefine((question, context) => {
  if (question.section === "listening" && !question.audioUrl) {
    context.addIssue({ code: "custom", path: ["audioUrl"], message: "Câu nghe phải có audio." });
  }
});
```

- [ ] **Step 4: Add pure attempt-state tests for locked Listening, free Reading, and section scoring**
- [ ] **Step 5: Implement pure helpers and run both test files**
- [ ] **Step 6: Commit with `feat: model sectioned TOPIK I attempts`**

### Task 2: Additive Supabase migration

**Files:**
- Create: `supabase/migrations/202608020041_upgrade_topik_i_exam_flow.sql`
- Modify: `docs/LUYEN_DE_TOPIK.md`

**Interfaces:**
- Produces RPCs: `save_exam_draft_v2(uuid,jsonb,jsonb)`, `start_exam_attempt(uuid)`, `start_attempt_section(uuid,text)`, `consume_exam_audio_play(uuid,uuid)`, `record_exam_window_event(uuid,text,text)`, `hotfix_published_exam(uuid,jsonb,jsonb,text)`.
- Produces columns for section durations/state, version snapshot, audio plays, monitoring count, and section scores.

- [ ] **Step 1: Write the migration with additive columns and checks**

```sql
alter table public.exam_sets
  add column listening_duration_minutes integer not null default 40 check (listening_duration_minutes between 1 and 180),
  add column reading_duration_minutes integer not null default 60 check (reading_duration_minutes between 1 and 180);

alter table public.exam_attempts
  add column exam_version integer not null default 1,
  add column current_section text not null default 'listening' check (current_section in ('listening','reading','completed')),
  add column listening_expires_at timestamptz,
  add column reading_expires_at timestamptz,
  add column audio_plays jsonb not null default '{}'::jsonb check (jsonb_typeof(audio_plays) = 'object'),
  add column window_leave_count integer not null default 0 check (window_leave_count >= 0),
  add column listening_score integer,
  add column reading_score integer;
```

- [ ] **Step 2: Add `exam_window_events` and `exam_hotfixes` with RLS and audit ownership**
- [ ] **Step 3: Implement RPCs with row locks, role checks, ownership checks, state transitions, and immutable attempt snapshots**
- [ ] **Step 4: Add `exam-images` public bucket with staff-only writes and supported image MIME types**
- [ ] **Step 5: Validate migration syntax using the available Supabase CLI/local database; if unavailable, document the exact unverified command `npx supabase db reset`**
- [ ] **Step 6: Update exam documentation with the new workflow and commit `feat: add TOPIK I sectioned exam schema`**

### Task 3: Server data access and API contract

**Files:**
- Modify: `lib/data/exams.ts`
- Modify: `features/exams/actions.ts`
- Create: `app/api/v1/exam-attempts/[attemptId]/section/route.ts`
- Create: `app/api/v1/exam-attempts/[attemptId]/audio/route.ts`
- Create: `app/api/v1/exam-attempts/[attemptId]/window-event/route.ts`
- Modify: `app/api/v1/exam-attempts/[attemptId]/answer/route.ts`
- Modify: `app/api/v1/exam-attempts/[attemptId]/submit/route.ts`
- Create: `app/api/v1/exam-attempts/exam-routes.test.ts`

**Interfaces:**
- Consumes Task 1 helpers and Task 2 RPCs.
- Produces authenticated endpoints that return `apiSuccess`/`apiError` envelopes.

- [ ] **Step 1: Write route tests for ownership, expiry, section access, play consumption, window-event deduplication, and section scoring**
- [ ] **Step 2: Run the route test and confirm failures**
- [ ] **Step 3: Replace direct service-role attempt creation with `start_exam_attempt` RPC and expose all new attempt fields through `getExamAttempt()`**
- [ ] **Step 4: Implement section transition endpoint**

```ts
const schema = z.object({ section: z.enum(["listening", "reading"]) });
const { error } = await actor.supabase.rpc("start_attempt_section", {
  p_attempt_id: attemptId,
  p_section: parsed.data.section,
});
```

- [ ] **Step 5: Implement audio consumption and monitoring endpoints; never trust client counters**
- [ ] **Step 6: Enforce Listening question order in answer route and compute per-section scores in submit route**
- [ ] **Step 7: Run route tests, typecheck, and commit `feat: enforce TOPIK I attempt workflow on server`**

### Task 4: Content editor for Listening and Reading

**Files:**
- Modify: `features/exams/exam-editor.tsx`
- Create: `features/exams/exam-import.ts`
- Create: `features/exams/exam-import.test.ts`
- Create: `features/exams/exam-media.tsx`
- Create: `features/exams/exam-editor.test.tsx`
- Modify: `app/bien-tap/de-thi/moi/page.tsx`
- Modify: `public/templates/` by adding `topik-i-exam-import-template.csv`

**Interfaces:**
- Consumes the existing `saveExamDraft` Server Action backed by
  `save_exam_draft_v2`, `/api/v1/tts`, `exam-audio`, and `exam-images`.
- Produces normalized `ExamQuestionInput[]` for both sections.

- [ ] **Step 1: Write parser tests for XLSX/CSV rows, section values, four options, correct option, duplicate positions, and optional image URL**
- [ ] **Step 2: Implement format-independent row normalization**

```ts
export type ExamImportRow = {
  section: "listening" | "reading";
  number: number;
  instruction: string;
  question: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  explanation: string;
  audio_text: string;
  image_url: string;
};
```

- [ ] **Step 3: Write component tests for section tabs, Listening audio eligibility, Reading media, and read-only review states**
- [ ] **Step 4: Split media controls into `ExamMedia`, add image upload, retain audio upload/Azure generation, and prevent media mutations outside editable states**
- [ ] **Step 5: Add separate Listening/Reading tabs, durations, counts, manual question creation, XLSX/CSV import, and eligibility summary**
- [ ] **Step 6: Run parser/component tests and commit `feat: author complete TOPIK I exams`**

### Task 5: Admin review, release, and hotfix

**Files:**
- Modify: `app/quan-tri/de-thi/page.tsx`
- Modify: `app/quan-tri/de-thi/[examId]/page.tsx`
- Create: `app/quan-tri/de-thi/[examId]/hotfix/page.tsx`
- Create: `features/exams/exam-hotfix-actions.ts`
- Create: `features/exams/exam-review.test.tsx`

**Interfaces:**
- Consumes existing review/release RPCs and Task 2 hotfix RPC.
- Produces a published-version hotfix workflow with audit reason.

- [ ] **Step 1: Write component/action tests proving admin sees both sections, media, correct answers, and state-specific controls**
- [ ] **Step 2: Add sectioned review UI and eligibility totals**
- [ ] **Step 3: Add hotfix entry point only for `published` exams; require a non-empty reason and validated complete payload**
- [ ] **Step 4: Revalidate `/luyen-de`, admin routes, and exam detail after hotfix**
- [ ] **Step 5: Test that hotfix changes the published version but not existing attempt snapshots**
- [ ] **Step 6: Commit `feat: review and hotfix published TOPIK I exams`**

### Task 6: Learner preparation and section shell

**Files:**
- Modify: `app/luyen-de/[examId]/page.tsx`
- Modify: `app/luyen-de/[examId]/lam-bai/page.tsx`
- Create: `features/exams/exam-stepper.tsx`
- Create: `features/exams/exam-preflight.tsx`
- Create: `features/exams/exam-preflight.test.tsx`

**Interfaces:**
- Consumes published exam metadata and Task 3 start/section actions.
- Produces accessible preparation confirmation and shared attempt stepper.

- [ ] **Step 1: Write tests for regulations, speaker check, desktop recommendation, agreement gate, and four-step status**
- [ ] **Step 2: Build Haru-branded preflight with a native audio test and explicit agreement checkbox**
- [ ] **Step 3: Build `ExamStepper` for Preparation, Listening, Reading, Result without distracting motion**
- [ ] **Step 4: Route the attempt page by server-authorized `current_section` rather than a client query parameter**
- [ ] **Step 5: Run tests and commit `feat: add TOPIK I exam preflight`**

### Task 7: Locked Listening and free Reading runners

**Files:**
- Replace responsibilities in: `features/exams/exam-runner.tsx`
- Create: `features/exams/listening-runner.tsx`
- Create: `features/exams/reading-runner.tsx`
- Create: `features/exams/use-window-monitor.ts`
- Create: `features/exams/listening-runner.test.tsx`
- Create: `features/exams/reading-runner.test.tsx`
- Create: `features/exams/use-window-monitor.test.ts`

**Interfaces:**
- Consumes Task 3 endpoints and Task 6 stepper.
- Produces section-specific runners with shared persistence status.

- [ ] **Step 1: Write Listening tests for explicit start, hidden native controls, disabled navigation while playing, consumed play, locked previous question, refresh state, and failed-load retry**
- [ ] **Step 2: Implement Listening runner using `audio.play()` only after the server grants the play token; do not render `controls`**
- [ ] **Step 3: Write Reading tests for free navigation, review flags, unanswered count, images, and timed submit**
- [ ] **Step 4: Implement Reading runner independently from audio behavior**
- [ ] **Step 5: Write monitoring tests that coalesce `blur` plus `visibilitychange` into one event and display the server-confirmed count**
- [ ] **Step 6: Implement red warning banner, focus/fullscreen event queue, offline answer queue, and reconnect retry**
- [ ] **Step 7: Run all runner tests and commit `feat: add authentic TOPIK I learner runners`**

### Task 8: Results, E2E, and release verification

**Files:**
- Modify: `app/luyen-de/[examId]/ket-qua/page.tsx`
- Create: `features/exams/exam-result.tsx`
- Create: `features/exams/exam-result.test.tsx`
- Modify: `tests/e2e/` by adding `topik-exam.spec.ts`
- Modify: `docs/LUYEN_DE_TOPIK.md`

**Interfaces:**
- Consumes section scores, snapshot questions, monitoring count, and final attempt state.
- Produces the learner result page and end-to-end regression coverage.

- [ ] **Step 1: Write result tests for Listening score, Reading score, total, unanswered questions, explanations, and window-leave count**
- [ ] **Step 2: Implement the Haru-branded result summary and section-grouped answer review**
- [ ] **Step 3: Add E2E coverage for editor creation, admin publication, learner section transitions, monitoring, hotfix snapshot isolation, and result rendering**
- [ ] **Step 4: Update operational documentation and migration instructions**
- [ ] **Step 5: Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run check:performance`, and relevant Playwright tests**
- [ ] **Step 6: Review `git diff --check` and `git status --short` to ensure no unrelated changes were overwritten**
- [ ] **Step 7: Commit `feat: complete TOPIK I exam workflow`**
