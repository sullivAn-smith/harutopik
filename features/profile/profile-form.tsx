"use client";

import { useActionState } from "react";
import { updateProfile } from "@/features/profile/actions";
import {
  initialProfileFormState,
  type ProfileFormState,
} from "@/lib/auth/schema";

type ProfileDefaults = {
  displayName: string;
  koreanLevel: string;
  learningGoal: string;
  dailyGoalMinutes: number;
  timezone: string;
  avatarUrl: string | null;
};

type Choice = { value: string; label: string; description: string };

const levels: Choice[] = [
  {
    value: "absolute_beginner",
    label: "Mới bắt đầu",
    description: "Chưa biết hoặc mới làm quen Hangul",
  },
  {
    value: "beginner",
    label: "Sơ cấp",
    description: "Hiểu câu và từ vựng cơ bản",
  },
  {
    value: "intermediate",
    label: "Trung cấp",
    description: "Giao tiếp được trong chủ đề quen thuộc",
  },
  {
    value: "advanced",
    label: "Nâng cao",
    description: "Đọc hiểu và giao tiếp khá tự nhiên",
  },
];

const goals: Choice[] = [
  {
    value: "daily_communication",
    label: "Giao tiếp hằng ngày",
    description: "Nghe nói tự nhiên trong cuộc sống",
  },
  {
    value: "topik",
    label: "Thi TOPIK",
    description: "Học theo lộ trình và cấp độ",
  },
  {
    value: "study_abroad",
    label: "Du học",
    description: "Chuẩn bị học tập tại Hàn Quốc",
  },
  {
    value: "work",
    label: "Công việc",
    description: "Dùng tiếng Hàn trong môi trường nghề nghiệp",
  },
  {
    value: "culture",
    label: "Văn hoá & sở thích",
    description: "Hiểu nội dung Hàn Quốc yêu thích",
  },
];

function FieldError({
  state,
  name,
}: {
  state: ProfileFormState;
  name: string;
}) {
  const message = state.fields?.[name]?.[0];
  return message ? (
    <p className="mt-2 text-sm font-semibold text-red-600">{message}</p>
  ) : null;
}

function RadioCards({
  name,
  choices,
  defaultValue,
}: {
  name: string;
  choices: Choice[];
  defaultValue: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map((choice) => (
        <label
          key={choice.value}
          className="cursor-pointer rounded-2xl border-2 border-slate-200 bg-white p-4 transition has-[:checked]:border-brand-500 has-[:checked]:bg-sky-50"
        >
          <input
            className="sr-only"
            type="radio"
            name={name}
            value={choice.value}
            defaultChecked={choice.value === defaultValue}
          />
          <span className="block font-black text-ink-900">{choice.label}</span>
          <span className="mt-1 block text-sm text-ink-600">
            {choice.description}
          </span>
        </label>
      ))}
    </div>
  );
}

export function ProfileForm({
  defaults,
  mode,
}: {
  defaults: ProfileDefaults;
  mode: "onboarding" | "edit";
}) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialProfileFormState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-8">
      <input type="hidden" name="intent" value={mode} />

      {state.message && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {state.message}
        </div>
      )}

      <fieldset>
        <legend className="text-lg font-black text-ink-900">
          1. Bạn muốn được gọi là gì?
        </legend>
        <p className="mt-1 text-sm text-ink-600">
          Tên này hiển thị trên hồ sơ và hành trình học.
        </p>
        <div className="mt-4 flex items-center gap-4">
          {defaults.avatarUrl ? (
            // The URL comes from the authenticated identity provider.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={defaults.avatarUrl}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 text-xl font-black text-brand-700">
              {defaults.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <input
            className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 px-4 py-3 font-semibold outline-none transition focus:border-brand-500"
            name="displayName"
            defaultValue={defaults.displayName}
            minLength={2}
            maxLength={50}
            autoComplete="name"
            required
          />
        </div>
        <FieldError state={state} name="displayName" />
      </fieldset>

      <fieldset>
        <legend className="text-lg font-black text-ink-900">
          2. Trình độ tiếng Hàn hiện tại
        </legend>
        <p className="mb-4 mt-1 text-sm text-ink-600">
          Harutopik sẽ dùng thông tin này để gợi ý bài phù hợp.
        </p>
        <RadioCards
          name="koreanLevel"
          choices={levels}
          defaultValue={defaults.koreanLevel}
        />
        <FieldError state={state} name="koreanLevel" />
      </fieldset>

      <fieldset>
        <legend className="text-lg font-black text-ink-900">
          3. Mục tiêu quan trọng nhất
        </legend>
        <p className="mb-4 mt-1 text-sm text-ink-600">
          Bạn có thể đổi lại bất cứ lúc nào.
        </p>
        <RadioCards
          name="learningGoal"
          choices={goals}
          defaultValue={defaults.learningGoal}
        />
        <FieldError state={state} name="learningGoal" />
      </fieldset>

      <fieldset>
        <legend className="text-lg font-black text-ink-900">
          Thời lượng mỗi ngày
        </legend>
        <div className="mt-4 flex flex-wrap gap-3">
          {[10, 15, 20, 30, 45, 60].map((minutes) => (
            <label
              key={minutes}
              className="cursor-pointer rounded-xl border-2 border-slate-200 px-4 py-2.5 font-bold has-[:checked]:border-brand-500 has-[:checked]:bg-sky-50 has-[:checked]:text-brand-700"
            >
              <input
                className="sr-only"
                type="radio"
                name="dailyGoalMinutes"
                value={minutes}
                defaultChecked={minutes === defaults.dailyGoalMinutes}
              />
              {minutes} phút
            </label>
          ))}
        </div>
        <FieldError state={state} name="dailyGoalMinutes" />
      </fieldset>

      <label className="block">
        <span className="font-black text-ink-900">Múi giờ</span>
        <select
          name="timezone"
          defaultValue={defaults.timezone}
          className="mt-3 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-brand-500"
        >
          <option value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</option>
          <option value="Asia/Seoul">Hàn Quốc (GMT+9)</option>
        </select>
        <FieldError state={state} name="timezone" />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-brand-600 px-6 py-4 text-lg font-black text-white shadow-lg shadow-sky-200 transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? "Đang lưu..."
          : mode === "onboarding"
            ? "Tạo lộ trình của tôi"
            : "Lưu thay đổi"}
      </button>
    </form>
  );
}
