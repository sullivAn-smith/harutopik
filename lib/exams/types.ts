import { z } from "zod";

export const examOptionSchema = z.string().trim().min(1, "Đáp án không được để trống.").max(500, "Đáp án không được dài quá 500 ký tự.");
export const examSectionSchema = z.enum(["listening", "reading"]);
export type ExamSection = z.infer<typeof examSectionSchema>;
export const examAnswerTypeSchema = z.enum(["text", "image"]);
export type ExamAnswerType = z.infer<typeof examAnswerTypeSchema>;
export const examLevelSchema = z.enum(["topik_i", "topik_ii"]);
export type ExamLevel = z.infer<typeof examLevelSchema>;
export const examAnswerReviewPolicySchema = z.enum(["immediate", "score_only", "after_date", "never"]);
export type ExamAnswerReviewPolicy = z.infer<typeof examAnswerReviewPolicySchema>;

export const examQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.number().int().positive(),
  section: examSectionSchema.default("listening"),
  audioBlockKey: z.string().trim().max(80).default(""),
  answerType: examAnswerTypeSchema.default("text"),
  instruction: z.string().trim().max(500).default(""),
  prompt: z.string().trim().max(1000).default(""),
  audioUrl: z.union([z.literal(""), z.string().url("Audio phải là URL hợp lệ.")]),
  audioText: z.string().trim().max(500).default(""),
  imageUrl: z.union([z.literal(""), z.string().url()]).default(""),
  playLimit: z.number().int().min(1).max(10).default(1),
  options: z.array(examOptionSchema).length(4),
  optionImages: z.array(z.union([z.literal(""), z.string().url("Ảnh đáp án phải là URL hợp lệ.")])).length(4).default(["", "", "", ""]),
  correctOption: z.number().int().min(1).max(4),
  explanation: z.string().trim().max(2000).default(""),
});

export const examDraftSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{2,79}$/, "Mã đề chỉ gồm chữ thường, số và dấu gạch ngang."),
  title: z.string().trim().min(3).max(160),
  level: examLevelSchema.default("topik_i"),
  answerReviewPolicy: examAnswerReviewPolicySchema.default("immediate"),
  answerReviewAvailableAt: z.string().trim().default(""),
  description: z.string().trim().max(1000).default(""),
  listeningDurationMinutes: z.number().int().min(1).max(180),
  readingDurationMinutes: z.number().int().min(1).max(180),
  instructions: z.string().trim().max(4000).default(""),
  questions: z.array(examQuestionSchema).max(100),
}).superRefine((value, context) => {
  if (value.answerReviewPolicy === "after_date") {
    const timestamp = Date.parse(value.answerReviewAvailableAt);
    if (!value.answerReviewAvailableAt || Number.isNaN(timestamp)) {
      context.addIssue({ code: "custom", path: ["answerReviewAvailableAt"], message: "Hãy chọn thời điểm công bố đáp án." });
    }
  }
});

export type ExamQuestionInput = z.infer<typeof examQuestionSchema>;
export type ExamDraftInput = z.infer<typeof examDraftSchema>;

type ExamValidationInput = {
  questions?: Array<{ section?: unknown; [key: string]: unknown }>;
};

export function formatExamValidationError(error: z.ZodError, input?: ExamValidationInput) {
  const issue = error.issues[0];
  if (!issue) return "Dữ liệu đề chưa hợp lệ.";

  const [field, questionIndex, questionField, optionIndex] = issue.path;
  const fieldMessages: Record<string, string> = {
    code: "Mã đề chỉ được gồm chữ thường, số và dấu gạch ngang; dài từ 3 đến 80 ký tự.",
    title: "Tên đề phải có từ 3 đến 160 ký tự.",
    level: "Hãy chọn TOPIK I hoặc TOPIK II.",
    answerReviewPolicy: "Chính sách xem đáp án chưa hợp lệ.",
    answerReviewAvailableAt: "Hãy chọn thời điểm công bố đáp án hợp lệ.",
    listeningDurationMinutes: "Thời gian Nghe phải là số nguyên từ 1 đến 180 phút.",
    readingDurationMinutes: "Thời gian Đọc phải là số nguyên từ 1 đến 180 phút.",
    description: "Mô tả không được dài quá 1.000 ký tự.",
    instructions: "Hướng dẫn không được dài quá 4.000 ký tự.",
  };
  if (field === "title" && issue.code === "too_small") return "Tên đề phải có ít nhất 3 ký tự.";
  if (field === "title" && issue.code === "too_big") return "Tên đề không được dài quá 160 ký tự.";
  if (typeof field === "string" && field !== "questions" && fieldMessages[field]) {
    return fieldMessages[field];
  }

  if (field === "questions" && typeof questionIndex === "number") {
    const section = input?.questions?.[questionIndex]?.section === "reading" ? "đọc" : "nghe";
    const prefix = `Câu ${section} ${questionIndex + 1}`;
    if (questionField === "options" && typeof optionIndex === "number") {
      return `${prefix}: đáp án ${optionIndex + 1} không được để trống.`;
    }
    if (questionField === "audioUrl") return `${prefix}: đường dẫn audio không hợp lệ.`;
    if (questionField === "imageUrl") return `${prefix}: đường dẫn ảnh không hợp lệ.`;
    if (questionField === "playLimit") return `${prefix}: số lượt nghe phải từ 1 đến 10.`;
    if (questionField === "correctOption") return `${prefix}: đáp án đúng phải là một lựa chọn từ 1 đến 4.`;
    if (questionField === "instruction") return `${prefix}: hướng dẫn không được dài quá 500 ký tự.`;
    if (questionField === "prompt") return `${prefix}: nội dung câu hỏi không được dài quá 1.000 ký tự.`;
    if (questionField === "audioText") return `${prefix}: nội dung tạo audio không được dài quá 500 ký tự.`;
    if (questionField === "explanation") return `${prefix}: giải thích không được dài quá 2.000 ký tự.`;
    return `${prefix}: dữ liệu chưa hợp lệ.`;
  }

  return "Dữ liệu đề chưa hợp lệ. Hãy kiểm tra lại các trường bắt buộc.";
}

export function getExamEligibility(questions: readonly ExamQuestionInput[]) {
  const listening = questions.filter((question) => question.section === "listening");
  const reading = questions.filter((question) => question.section === "reading");
  const issues: string[] = [];
  if (listening.length === 0) issues.push("Đề phải có ít nhất một câu nghe.");
  if (reading.length === 0) issues.push("Đề phải có ít nhất một câu đọc.");
  const invalidImageQuestion = questions.find((question) =>
    question.answerType === "image" && question.optionImages.some((url) => !url),
  );
  if (invalidImageQuestion) issues.push(`Câu ${invalidImageQuestion.position} dùng đáp án ảnh nhưng chưa đủ 4 ảnh.`);
  return {
    eligible: issues.length === 0,
    listeningCount: listening.length,
    readingCount: reading.length,
    issues,
  };
}

export type ExamSummary = {
  id: string;
  code: string;
  title: string;
  level: ExamLevel;
  description: string;
  durationMinutes: number;
  listeningDurationMinutes: number;
  readingDurationMinutes: number;
  status: string;
  questionCount: number;
  listeningQuestionCount: number;
  readingQuestionCount: number;
  answerReviewPolicy: ExamAnswerReviewPolicy;
  answerReviewAvailableAt: string | null;
  updatedAt: string;
};

export type PublicExamQuestion = Omit<ExamQuestionInput, "correctOption" | "explanation"> & {
  id: string;
};
