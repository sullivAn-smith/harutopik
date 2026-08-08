"use client";

import { useState } from "react";
import {
  grantStreakShields,
  updateStreakSettings,
} from "@/features/streak/admin-actions";
import type {
  StreakManagedUser,
  StreakSettings,
} from "@/lib/data/streak-admin";

export function AdminStreakPanel({
  settings,
  users,
  totalUsers,
}: {
  settings: StreakSettings;
  users: StreakManagedUser[];
  totalUsers: number;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const allVisibleSelected = users.length > 0 && users.every((user) => selected.includes(user.id));
  const toggleAll = () =>
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !users.some((user) => user.id === id))
        : [...new Set([...current, ...users.map((user) => user.id)])],
    );

  return (
    <div className="mt-8 grid gap-7">
      <section className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
        <form action={updateStreakSettings} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(16,36,62,.08)]">
          <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Quy tắc tự động</p>
          <h2 className="mt-2 text-2xl font-black">Thưởng và nhắc học</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Mọi phép tính chạy ở server theo giờ Việt Nam. Thay đổi chỉ áp dụng cho mốc tiếp theo.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="font-bold text-slate-700">Mỗi bao nhiêu ngày
              <input name="interval" type="number" min="1" max="365" defaultValue={settings.shieldRewardInterval} className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-cyan-500" />
            </label>
            <label className="font-bold text-slate-700">Tặng số khiên
              <input name="amount" type="number" min="1" max="100" defaultValue={settings.shieldRewardAmount} className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-cyan-500" />
            </label>
            <label className="font-bold text-slate-700">Khiên tối đa tự nhận
              <input name="maxShields" type="number" min="0" max="1000" defaultValue={settings.maxShields} className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-cyan-500" />
            </label>
            <label className="font-bold text-slate-700">Giờ nhắc theo giờ Việt Nam (0–23)
              <input name="reminderHour" type="number" min="0" max="23" defaultValue={settings.reminderHour} className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-cyan-500" />
            </label>
          </div>
          <label className="mt-5 flex items-center gap-3 rounded-2xl bg-cyan-50 px-4 py-3 font-bold text-slate-700">
            <input name="reminderEnabled" type="checkbox" defaultChecked={settings.reminderEnabled} className="h-5 w-5 accent-cyan-600" />
            Bật thông báo nhắc học trong hệ thống
          </label>
          <button className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#087eba] to-[#18a7d8] px-5 py-3.5 font-black text-white shadow-lg">Lưu quy tắc</button>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(16,36,62,.08)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-700">Phân phối khiên</p><h2 className="mt-2 text-2xl font-black">Tặng cho người học</h2></div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">{totalUsers} tài khoản</span>
          </div>
          <form action={grantStreakShields} className="mt-5">
            {selected.map((id) => <input key={id} type="hidden" name="userIds" value={id} />)}
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <label className="font-bold text-slate-700">Số khiên<input name="amount" type="number" min="1" max="100" defaultValue="1" className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-cyan-500" /></label>
              <label className="font-bold text-slate-700">Lý do<input name="reason" required minLength={3} placeholder="Ví dụ: Quà sự kiện tháng 8" className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-cyan-500" /></label>
            </div>
            <div className="mt-4 max-h-80 overflow-auto rounded-2xl border border-slate-200">
              <button type="button" onClick={toggleAll} className="sticky top-0 z-10 flex w-full items-center justify-between border-b bg-slate-50 px-4 py-3 text-left text-sm font-black text-cyan-800">
                <span>{allVisibleSelected ? "Bỏ chọn kết quả đang hiện" : "Chọn tất cả kết quả đang hiện"}</span><span>{selected.length} đã chọn</span>
              </button>
              {users.map((user) => (
                <label key={user.id} className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-cyan-50/60">
                  <input type="checkbox" checked={selected.includes(user.id)} onChange={() => setSelected((current) => current.includes(user.id) ? current.filter((id) => id !== user.id) : [...current, user.id])} className="h-5 w-5 accent-cyan-600" />
                  <span className="min-w-0 flex-1"><strong className="block truncate">{user.displayName}</strong><small className="block truncate text-slate-500">{user.email}</small></span>
                  <span className="text-right text-xs font-bold text-slate-500">🔥 {user.currentStreak}<br />🛡 {user.shieldCount}</span>
                </label>
              ))}
              {users.length === 0 && <p className="p-8 text-center font-bold text-slate-500">Không tìm thấy tài khoản.</p>}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button name="scope" value="selected" disabled={selected.length === 0} className="rounded-2xl bg-[#10243e] px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Tặng {selected.length} tài khoản</button>
              <button name="scope" value="all" onClick={(event) => { if (!window.confirm(`Tặng cho toàn bộ ${totalUsers} tài khoản?`)) event.preventDefault(); }} className="rounded-2xl border-2 border-orange-200 bg-orange-50 px-5 py-3 font-black text-orange-800">Tặng toàn hệ thống</button>
            </div>
          </form>
        </div>
      </section>

    </div>
  );
}
