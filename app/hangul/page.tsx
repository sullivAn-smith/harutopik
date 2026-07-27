import Link from "next/link";

const vowels = [
  { letter: "ㅏ", sound: "a", example: "아기", meaning: "em bé" },
  { letter: "ㅓ", sound: "eo", example: "어머니", meaning: "mẹ" },
  { letter: "ㅗ", sound: "o", example: "오이", meaning: "dưa leo" },
  { letter: "ㅜ", sound: "u", example: "우유", meaning: "sữa" },
  { letter: "ㅡ", sound: "eu", example: "음악", meaning: "âm nhạc" },
  { letter: "ㅣ", sound: "i", example: "이름", meaning: "tên" },
];

export default function HangulPage() {
  return (
    <main className="min-h-screen bg-rose-50 text-slate-800">
      <header className="border-b border-rose-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-bold text-rose-600">
            안녕 Korean
          </Link>
          <Link
            href="/"
            className="font-semibold text-slate-600 hover:text-rose-600"
          >
            ← Về trang chủ
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="font-semibold text-rose-500">BÀI 1 · NHẬP MÔN</p>
        <h1 className="mt-2 text-4xl font-bold">Nguyên âm cơ bản</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Hangul là bảng chữ cái tiếng Hàn. Hãy bắt đầu với 6 nguyên âm cơ
          bản dưới đây và đọc thành tiếng từng chữ.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vowels.map((item) => (
            <article
              key={item.letter}
              className="rounded-3xl border border-rose-100 bg-white p-7 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="text-6xl font-bold text-rose-500">
                  {item.letter}
                </span>
                <span className="rounded-full bg-rose-100 px-4 py-2 font-bold text-rose-600">
                  /{item.sound}/
                </span>
              </div>
              <p className="mt-6 text-xl font-bold">{item.example}</p>
              <p className="mt-1 text-slate-500">{item.meaning}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-slate-900 p-8 text-white">
          <p className="text-sm font-bold text-rose-300">MẸO GHI NHỚ</p>
          <h2 className="mt-2 text-2xl font-bold">
            Đọc chậm, nhìn chữ và lặp lại 3 lần
          </h2>
          <p className="mt-3 text-slate-300">
            Khi đã nhớ mặt chữ, hãy thử che phần phiên âm và tự đọc lại.
          </p>
        </div>
      </section>
    </main>
  );
}
