import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Email chưa đúng định dạng."));

export const passwordSchema = z
  .string()
  .min(8, "Mật khẩu cần ít nhất 8 ký tự.")
  .max(72, "Mật khẩu không được vượt quá 72 ký tự.")
  .regex(/[A-Za-zÀ-ỹ]/, "Mật khẩu cần có ít nhất một chữ cái.")
  .regex(/\d/, "Mật khẩu cần có ít nhất một chữ số.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Tên hiển thị cần ít nhất 2 ký tự.")
      .max(50, "Tên hiển thị không được vượt quá 50 ký tự."),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận chưa khớp.",
  });

export const learnerProfileSchema = z.object({
  id: z.uuid(),
  displayName: z.string().min(2).max(50),
  avatarUrl: z.url().nullable(),
  nativeLanguage: z.literal("vi"),
  koreanLevel: z.enum(["absolute_beginner", "beginner", "intermediate", "advanced"]),
  learningGoal: z.enum(["daily_communication", "topik", "study_abroad", "work", "culture"]),
  dailyGoalMinutes: z.number().int().min(5).max(180),
  timezone: z.string().min(1),
  onboardingCompleted: z.boolean(),
  onboardingCompletedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type LearnerProfile = z.infer<typeof learnerProfileSchema>;

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Tên hiển thị cần ít nhất 2 ký tự.")
    .max(50, "Tên hiển thị không được vượt quá 50 ký tự."),
  koreanLevel: z.enum(
    ["absolute_beginner", "beginner", "intermediate", "advanced"],
    "Vui lòng chọn trình độ hiện tại.",
  ),
  learningGoal: z.enum(
    ["daily_communication", "topik", "study_abroad", "work", "culture"],
    "Vui lòng chọn mục tiêu học.",
  ),
  dailyGoalMinutes: z.coerce
    .number("Vui lòng chọn thời lượng học mỗi ngày.")
    .int()
    .min(5)
    .max(180),
  timezone: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn múi giờ.")
    .max(100),
});

export const profileFormSchema = profileUpdateSchema.extend({
  intent: z.enum(["onboarding", "edit"]),
});

export type ProfileFormState = AuthFormState;
export const initialProfileFormState: ProfileFormState = { status: "idle" };

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: Record<string, string[]>;
};

export const initialAuthFormState: AuthFormState = { status: "idle" };
