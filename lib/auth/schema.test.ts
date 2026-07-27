import { describe, expect, it } from "vitest";
import {
  profileFormSchema,
  profileUpdateSchema,
  signInSchema,
  signUpSchema,
} from "./schema";

describe("authentication schemas", () => {
  it("normalizes email before authentication", () => {
    const result = signInSchema.parse({
      email: "  Learner@Example.com ",
      password: "secret",
    });

    expect(result.email).toBe("learner@example.com");
  });

  it("rejects a weak password", () => {
    const result = signUpSchema.safeParse({
      displayName: "Haru",
      email: "haru@example.com",
      password: "abcdefgh",
      confirmPassword: "abcdefgh",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched password confirmation", () => {
    const result = signUpSchema.safeParse({
      displayName: "Haru",
      email: "haru@example.com",
      password: "harutopik1",
      confirmPassword: "harutopik2",
    });

    expect(result.success).toBe(false);
  });
});

describe("learner profile schemas", () => {
  const validProfile = {
    displayName: "Sullivan",
    koreanLevel: "beginner",
    learningGoal: "topik",
    dailyGoalMinutes: 20,
    timezone: "Asia/Ho_Chi_Minh",
  };

  it("accepts a profile that can be shared by web and mobile", () => {
    expect(profileUpdateSchema.parse(validProfile)).toEqual(validProfile);
  });

  it("coerces the HTML form daily goal to a number", () => {
    const result = profileFormSchema.parse({
      ...validProfile,
      dailyGoalMinutes: "30",
      intent: "onboarding",
    });

    expect(result.dailyGoalMinutes).toBe(30);
  });

  it("rejects invalid profile choices", () => {
    const result = profileUpdateSchema.safeParse({
      ...validProfile,
      koreanLevel: "expert",
    });

    expect(result.success).toBe(false);
  });
});
