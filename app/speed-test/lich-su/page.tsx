import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";
import { deriveSpeedTestAchievements } from "@/lib/speed-test/domain";

export const metadata: Metadata = { title: "Thành tích Speed Test" };
export const dynamic = "force-dynamic";

type Attempt = {
  id: string;
  list_name: string;
  direction: "vi_ko" | "ko_vi";
  answered_count: number;
  correct_count: number;
  near_miss_count: number;
  total_questions: number;
  remaining_seconds: number;
  accuracy: number | string;
  best_combo: number;
  rating: string;
  finish_reason: "completed" | "timed_out";
  is_daily: boolean;
  created_at: string;
};

type Progress = {
  vocabulary_id: string;
  correct_count: number;
  wrong_count: number;
  near_miss_count: number;
  average_response_time_ms: number;
  mastery_score: number | string;
  mastery_status: "new" | "learning" | "familiar" | "mastered";
  last_wrong_at: string | null;
};

const masteryLabels = {
  new: "Mới",
  learning: "Đang học",
  familiar: "Đã quen",
  mastered: "Đã thuộc",
} as const;

export default async function SpeedTestHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ sourceKind?: string; sourceId?: string }>;
}) {
  const [actor, query] = await Promise.all([getCurrentActor(), searchParams]);
  if (!actor) redirect("/dang-nhap?next=%2Fspeed-test%2Flich-su");
  const supabase = await createClient();
  let attemptsQuery = supabase
    .from("speed_test_attempts")
    .select("id,list_name,direction,total_questions,answered_count,correct_count,near_miss_count,accuracy,remaining_seconds,best_combo,rating,finish_reason,is_daily,created_at")
    .eq("user_id", actor.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if ((query.sourceKind === "list" || query.sourceKind === "lesson") && query.sourceId) {
    attemptsQuery = attemptsQuery.eq("source_kind", query.sourceKind).eq("source_id", query.sourceId);
  }
  const { data: attemptRows } = await attemptsQuery;
  const attempts = (attemptRows ?? []) as Attempt[];
  const attemptIds = attempts.map((attempt) => attempt.id);
  const { data: answerRows } = attemptIds.length
    ? await supabase
        .from("speed_test_answers")
        .select("attempt_id,vocabulary_id,direction,prompt_snapshot,expected_answer_snapshot,result")
        .eq("user_id", actor.id)
        .in("attempt_id", attemptIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const vocabularyIds = [...new Set((answerRows ?? []).map((row) => row.vocabulary_id))];
  const { data: progressRows } = vocabularyIds.length
    ? await supabase
        .from("user_word_progress")
        .select("vocabulary_id,correct_count,wrong_count,near_miss_count,average_response_time_ms,mastery_score,mastery_status,last_wrong_at")
        .eq("user_id", actor.id)
        .in("vocabulary_id", vocabularyIds)
    : { data: [] };
  const snapshots = new Map<string, { korean: string; vietnamese: string }>();
  for (const answer of answerRows ?? []) {
    if (snapshots.has(answer.vocabulary_id)) continue;
    snapshots.set(answer.vocabulary_id, answer.direction === "vi_ko"
      ? { korean: answer.expected_answer_snapshot, vietnamese: answer.prompt_snapshot }
      : { korean: answer.prompt_snapshot, vietnamese: answer.expected_answer_snapshot });
  }
  const weakWords = ((progressRows ?? []) as Progress[])
    .filter((item) => item.wrong_count + item.near_miss_count > 0 || Number(item.mastery_score) < 65)
    .sort((left, right) => Number(left.mastery_score) - Number(right.mastery_score))
    .slice(0, 30);
  const averageAccuracy = attempts.length
    ? Math.round(attempts.reduce((sum, attempt) => sum + Number(attempt.accuracy), 0) / attempts.length)
    : 0;
  const best = attempts.reduce<Attempt | null>((current, attempt) =>
    !current || Number(attempt.accuracy) > Number(current.accuracy) ? attempt : current, null);
  const bestAccuracy = attempts.reduce((value, attempt) => Math.max(value, Number(attempt.accuracy)), 0);
  const bestCombo = attempts.reduce((value, attempt) => Math.max(value, attempt.best_combo), 0);
  const bestRemaining = attempts
    .filter((attempt) => attempt.finish_reason === "completed")
    .reduce((value, attempt) => Math.max(value, attempt.remaining_seconds), 0);
  const perfectCount = attempts.filter((attempt) =>
    attempt.finish_reason === "completed" && Number(attempt.accuracy) === 100
  ).length;
  const achievements = deriveSpeedTestAchievements(attempts.map((attempt) => ({
    accuracy: Number(attempt.accuracy),
    bestCombo: attempt.best_combo,
    remainingSeconds: attempt.remaining_seconds,
    totalQuestions: attempt.total_questions,
    completed: attempt.finish_reason === "completed",
  })));
  const achievementCards = [
    { key: "firstRun", icon: "⚡", title: "Khởi động", detail: "Hoàn thành Speed Test đầu tiên" },
    { key: "perfect", icon: "🎯", title: "Perfect", detail: "Hoàn thành một bài với 100%" },
    { key: "comboMaster", icon: "🔥", title: "Combo Master", detail: "Đạt combo 20" },
    { key: "speedDemon", icon: "🚀", title: "Speed Demon", detail: "30 câu, còn ít nhất 60 giây" },
    { key: "consistent", icon: "💪", title: "Ổn định", detail: "3 lượt gần nhất đạt từ 90%" },
    { key: "veteran", icon: "🏅", title: "Bền bỉ", detail: "Hoàn thành 10 lượt Speed Test" },
  ] as const;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#78d7f5,transparent_35rem),linear-gradient(145deg,#0b87c4,#075397)] px-4 py-7 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/speed-test" className="rounded-2xl bg-white/90 px-5 py-3 font-black text-ink-900 shadow-lg">← Speed Test</Link>
          <Link href="/" className="rounded-2xl bg-[#10243e] px-5 py-3 font-black text-white shadow-lg">Trang chủ</Link>
        </div>
        <header className="mt-7 rounded-[2rem] border border-white/60 bg-white/92 p-7 shadow-2xl sm:p-10">
          <p className="font-black uppercase tracking-[.2em] text-brand-600">Speed Test</p>
          <h1 className="mt-2 text-4xl font-black text-ink-900 sm:text-5xl">Thành tích</h1>
          <p className="mt-3 text-ink-600">Kỷ lục, tiến độ và những từ bạn cần ôn lại.</p>
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric value={String(attempts.length)} label="Lần kiểm tra" />
            <Metric value={`${averageAccuracy}%`} label="Độ chính xác TB" />
            <Metric value={best?.rating ?? "—"} label="Xếp hạng tốt nhất" />
            <Metric value={String(weakWords.length)} label="Từ cần ôn" />
          </div>
        </header>

        <section className="mt-7 rounded-[2rem] bg-[#10243e] p-6 text-white shadow-2xl sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-black uppercase tracking-[.18em] text-cyan-300">Kỷ lục cá nhân</p><h2 className="mt-1 text-3xl font-black">Tốt nhất của bạn</h2></div><span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">Chính xác → Ghi nhớ → Tốc độ</span></div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Record value={`${bestAccuracy}%`} label="Best Accuracy" />
            <Record value={`🔥 ${bestCombo}`} label="Best Combo" />
            <Record value={`${bestRemaining}s`} label="Best Remaining" />
            <Record value={String(perfectCount)} label="Perfect Tests" />
          </div>
        </section>

        <section className="mt-7 rounded-[2rem] bg-white/95 p-6 shadow-2xl sm:p-8">
          <h2 className="text-2xl font-black text-ink-900">Thành tích</h2>
          <p className="mt-1 text-sm font-semibold text-ink-500">Mỗi huy hiệu phản ánh một cột mốc học tập thực tế, không cộng điểm ảo.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{achievementCards.map((achievement) => {
            const unlocked = achievements[achievement.key];
            return <article key={achievement.key} className={`rounded-2xl border p-5 transition ${unlocked ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md" : "border-slate-200 bg-slate-50 opacity-55"}`}>
              <div className="flex items-start gap-4"><span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl ${unlocked ? "bg-white shadow" : "bg-slate-200 grayscale"}`}>{achievement.icon}</span><div><b className="text-lg text-ink-900">{achievement.title}</b><span className="mt-1 block text-sm font-semibold text-ink-600">{achievement.detail}</span><span className={`mt-2 block text-xs font-black uppercase tracking-wider ${unlocked ? "text-emerald-700" : "text-slate-400"}`}>{unlocked ? "Đã mở khóa" : "Chưa mở"}</span></div></div>
            </article>;
          })}</div>
        </section>

        <section className="mt-7 rounded-[2rem] bg-white/95 p-6 shadow-2xl sm:p-8">
          <h2 className="text-2xl font-black text-ink-900">Từ cần ưu tiên</h2>
          <p className="mt-1 text-sm font-semibold text-ink-500">Mastery thấp và các từ từng sai được xếp lên trước.</p>
          {weakWords.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">
            {weakWords.map((progress) => {
              const word = snapshots.get(progress.vocabulary_id);
              return <article key={progress.vocabulary_id} className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-cyan-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><b lang="ko" className="text-2xl text-ink-900">{word?.korean ?? "Từ vựng"}</b><span className="mt-1 block font-semibold text-ink-600">{word?.vietnamese ?? ""}</span></div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-brand-700">{masteryLabels[progress.mastery_status]}</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${Number(progress.mastery_score)}%` }} /></div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-ink-600"><span>{Number(progress.mastery_score)}% mastery</span><span>✓ {progress.correct_count}</span><span>△ {progress.near_miss_count}</span><span>✕ {progress.wrong_count}</span><span>{(progress.average_response_time_ms / 1000).toFixed(1)}s phản hồi</span></div>
              </article>;
            })}
          </div> : <Empty text="Chưa có từ yếu. Hãy hoàn thành một Speed Test để hệ thống bắt đầu phân tích." />}
        </section>

        <section className="mt-7 rounded-[2rem] bg-white/95 p-6 shadow-2xl sm:p-8">
          <h2 className="text-2xl font-black text-ink-900">Các lần gần đây</h2>
          {attempts.length ? <div className="mt-5 space-y-3">{attempts.map((attempt) => <article key={attempt.id} className="grid items-center gap-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-5 sm:grid-cols-[1fr_auto_auto]">
            <div><div className="flex flex-wrap items-center gap-2"><b className="text-lg text-ink-900">{attempt.list_name}</b>{attempt.is_daily && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">📅 DAILY</span>}</div><span className="mt-1 block text-sm font-semibold text-ink-500">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(attempt.created_at))} · {attempt.direction === "vi_ko" ? "Việt → Hàn" : "Hàn → Việt"}</span></div>
            <div className="text-sm font-bold text-ink-600"><span className="mr-4">{attempt.correct_count}/{attempt.answered_count} đúng</span><span>🔥 {attempt.best_combo}</span></div>
            <div className="flex items-center gap-3"><b className="text-xl text-brand-700">{Number(attempt.accuracy)}%</b><span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 font-black text-white">{attempt.rating}</span></div>
          </article>)}</div> : <Empty text="Chưa có lịch sử Speed Test cho nội dung này." />}
        </section>
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl bg-sky-50 p-4 text-center"><b className="text-2xl text-ink-900">{value}</b><span className="mt-1 block text-sm font-bold text-ink-600">{label}</span></div>;
}

function Record({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/10"><b className="text-2xl text-white sm:text-3xl">{value}</b><span className="mt-1 block text-sm font-bold text-sky-200">{label}</span></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-5 rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center font-semibold text-ink-500">{text}</div>;
}
