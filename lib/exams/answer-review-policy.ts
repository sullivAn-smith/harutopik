import type { ExamAnswerReviewPolicy } from "./types";

export const answerReviewPolicyOptions: Array<{
  value: ExamAnswerReviewPolicy;
  label: string;
  description: string;
}> = [
  { value: "immediate", label: "Xem ngay sau khi nộp", description: "Người học xem đáp án, lời giải và bài làm ngay sau khi nộp." },
  { value: "score_only", label: "Chỉ xem điểm", description: "Người học chỉ thấy điểm và thống kê, không thấy đáp án." },
  { value: "after_date", label: "Xem sau ngày công bố", description: "Đáp án chỉ mở từ thời điểm admin đã chọn." },
  { value: "never", label: "Không công bố đáp án", description: "Đề chỉ trả điểm, đáp án luôn được giữ kín." },
];

export function answerReviewPolicyLabel(policy: ExamAnswerReviewPolicy) {
  return answerReviewPolicyOptions.find((option) => option.value === policy)?.label ?? "Xem ngay sau khi nộp";
}

export function canReviewExamAnswers(policy: ExamAnswerReviewPolicy, availableAt: string | null, now = new Date()) {
  if (policy === "immediate") return true;
  if (policy !== "after_date" || !availableAt) return false;
  const timestamp = Date.parse(availableAt);
  return !Number.isNaN(timestamp) && timestamp <= now.getTime();
}
