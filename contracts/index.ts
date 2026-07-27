export { lessonSchema, type Lesson } from "@/content/schema";
export {
  learningEventSchema,
  type LearningEventInput,
} from "@/lib/learning-core/progress-schema";
export type {
  Entitlement,
} from "@/lib/billing/entitlements";

export type ApiSuccess<T> = {
  data: T;
  meta: { apiVersion: "1"; requestId: string };
};

export type ApiFailure = {
  error: { code: string; message: string; details?: unknown };
  meta: { apiVersion: "1"; requestId: string };
};
