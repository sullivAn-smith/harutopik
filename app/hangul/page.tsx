import Link from "next/link";

type Letter = {
  letter: string;
  sound: string;
  name?: string;
  example: string;
  meaning: string;
};

const basicVowels: Letter[] = [
  { letter: "ㅏ", sound: "a", example: "아기", meaning: "em bé" },
  { letter: "ㅑ", sound: "ya", example: "야구", meaning: "bóng chày" },
  { letter: "ㅓ", sound: "eo", example: "어머니", meaning: "mẹ" },
  { letter: "ㅕ", sound: "yeo", example: "여자", meaning: "phụ nữ" },
  { letter: "ㅗ", sound: "o", example: "오이", meaning: "dưa leo" },
  { letter: "ㅛ", sound: "yo", example: "요리", meaning: "nấu ăn" },
  { letter: "ㅜ", sound: "u", example: "우유", meaning: "sữa" },
  { letter: "ㅠ", sound: "yu", example: "유리", meaning: "thủy tinh" },
  { letter: "ㅡ", sound: "eu", example: "음악", meaning: "âm nhạc" },
  { letter: "ㅣ", sound: "i", example: "이름", meaning: "tên" },
];

const compoundVowels: Letter[] = [
  { letter: "ㅐ", sound: "ae", example: "개", meaning: "con chó" },
  { letter: "ㅒ", sound: "yae", example: "얘기", meaning: "câu chuyện" },
  { letter: "ㅔ", sound: "e", example: "게", meaning: "con cua" },
  { letter: "ㅖ", sound: "ye", example: "예", meaning: "vâng" },
  { letter: "ㅘ", sound: "wa", example: "과자", meaning: "bánh kẹo" },
  { letter: "ㅙ", sound: "wae", example: "왜", meaning: "tại sao" },
  { letter: "ㅚ", sound: "oe", example: "회사", meaning: "công ty" },
  { letter: "ㅝ", sound: "wo", example: "원", meaning: "won" },
  { letter: "ㅞ", sound: "we", example: "웨이터", meaning: "bồi bàn" },
  { letter: "ㅟ", sound: "wi", example: "위", meaning: "phía trên" },
  { letter: "ㅢ", sound: "ui", example: "의사", meaning: "bác sĩ" },
];

const basicConsonants: Letter[] = [
  { letter: "ㄱ", name: "기역", sound: "g/k", example: "가방", meaning: "cặp" },
  { letter: "ㄴ", name: "니은", sound: "n", example: "나라", meaning: "đất nước" },
  { letter: "ㄷ", name: "디귿", sound: "d/t", example: "다리", meaning: "chân" },
  { letter: "ㄹ", name: "리을", sound: "r/l", example: "라디오", meaning: "radio" },
  { letter: "ㅁ", name: "미음", sound: "m", example: "마음", meaning: "tấm lòng" },
  { letter: "ㅂ", name: "비읍", sound: "b/p", example: "바다", meaning: "biển" },
  { letter: "ㅅ", name: "시옷", sound: "s", example: "사과", meaning: "táo" },
  { letter: "ㅇ", name: "이응", sound: "ng/∅", example: "아이", meaning: "đứa trẻ" },
  { letter: "ㅈ", name: "지읒", sound: "j", example: "지도", meaning: "bản đồ" },
  { letter: "ㅊ", name: "치읓", sound: "ch", example: "친구", meaning: "bạn bè" },
  { letter: "ㅋ", name: "키읔", sound: "k", example: "코", meaning: "mũi" },
  { letter: "ㅌ", name: "티읕", sound: "t", example: "토끼", meaning: "thỏ" },
  { letter: "ㅍ", name: "피읖", sound: "p", example: "포도", meaning: "nho" },
  { letter: "ㅎ", name: "히읗", sound: "h", example: "하늘", meaning: "bầu trời" },
];

const doubleConsonants: Letter[] = [
  { letter: "ㄲ", name: "쌍기역", sound: "kk", example: "꽃", meaning: "hoa" },
  { letter: "ㄸ", name: "쌍디귿", sound: "tt", example: "딸", meaning: "con gái" },
  { letter: "ㅃ", name: "쌍비읍", sound: "pp", example: "빵", meaning: "bánh mì" },
  { letter: "ㅆ", name: "쌍시옷", sound: "ss", example: "쌀", meaning: "gạo" },
  { letter: "ㅉ", name: "쌍지읒", sound: "jj", example: "짜다", meaning: "mặn" },
];

function LetterGrid({
  items,
  tone,
}: {
  items: Letter[];
  tone: "blue" | "purple";
}) {
  const styles =
    tone === "blue"
      ? {
          card: "border-sky-200 bg-gradient-to-br from-white to-sky-50",
          letter: "text-[#087eba]",
          sound: "bg-sky-100 text-[#087eba]",
          name: "text-blue-800",
        }
      : {
          card: "border-violet-200 bg-gradient-to-br from-white to-violet-50",
          letter: "text-violet-700",
          sound: "bg-violet-100 text-violet-800",
          name: "text-violet-800",
        };

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <article
          key={item.letter}
          className={`rounded-3xl border p-5 shadow-[0_10px_28px_rgba(16,36,62,0.08)] transition hover:-translate-y-1 ${styles.card}`}
        >
          <div className="flex items-start justify-between gap-3">
            <span
              lang="ko"
              className={`font-korean text-5xl font-black ${styles.letter}`}
            >
              {item.letter}
            </span>
            <span className={`rounded-full px-3 py-1.5 text-sm font-black ${styles.sound}`}>
              /{item.sound}/
            </span>
          </div>
          {item.name && (
            <p lang="ko" className={`mt-3 font-black ${styles.name}`}>
              {item.name}
            </p>
          )}
          <p lang="ko" className="font-korean mt-4 text-lg font-black text-[#10243e]">
            {item.example}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#65758b]">
            {item.meaning}
          </p>
        </article>
      ))}
    </div>
  );
}

export default function HangulPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eaf7ff_0%,#f7fbff_45%,#eef4ff_100%)] text-[#10243e]">
      <header className="sticky top-0 z-20 border-b border-white/80 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-4">
          <Link
            href="/"
            className="rounded-full border border-sky-200 bg-white px-4 py-2.5 text-sm font-black text-[#087eba] shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50"
          >
            ← Về trang học
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 md:py-14">
        <div className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(125deg,#10243e,#087eba_60%,#18b6d9)] p-7 text-white shadow-[0_24px_60px_rgba(8,126,186,0.24)] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">
            Bảng chữ cái tiếng Hàn
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
            Làm quen Hangul theo từng nhóm âm
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-100">
            Nhìn mặt chữ, đọc âm và liên hệ với từ ví dụ. Nguyên âm và phụ âm
            được tách màu để bạn nhận biết nhanh hơn khi ghép âm tiết.
          </p>
        </div>

        <section className="mt-9 rounded-[2rem] border border-white bg-white/90 p-6 shadow-[0_18px_45px_rgba(16,36,62,0.1)] md:p-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-black text-[#087eba]">
                Màu xanh · Nguyên âm
              </span>
              <h2 className="mt-4 text-3xl font-black">10 nguyên âm cơ bản</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#65758b]">
              Các nét ngắn bổ sung âm “y”; hướng của nét giúp bạn ghi nhớ khẩu
              hình và cách phát âm.
            </p>
          </div>
          <LetterGrid items={basicVowels} tone="blue" />
        </section>

        <section className="mt-7 rounded-[2rem] border border-white bg-white/90 p-6 shadow-[0_18px_45px_rgba(16,36,62,0.1)] md:p-9">
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-800">
            Ghép nguyên âm
          </span>
          <h2 className="mt-4 text-3xl font-black">11 nguyên âm mở rộng</h2>
          <LetterGrid items={compoundVowels} tone="blue" />
        </section>

        <section className="mt-7 rounded-[2rem] border border-violet-100 bg-[#f7f4fb] p-6 shadow-[0_18px_45px_rgba(61,45,91,0.12)] md:p-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="rounded-full bg-violet-200/70 px-4 py-2 text-sm font-black text-violet-900">
                Màu tím trầm · Phụ âm
              </span>
              <h2 className="mt-4 text-3xl font-black">14 phụ âm cơ bản</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-violet-900/65">
              Một số phụ âm đổi nhẹ cách đọc tùy vị trí đầu hoặc cuối âm tiết.
              Hãy nhớ tên chữ trước, sau đó luyện âm trong từ.
            </p>
          </div>
          <LetterGrid items={basicConsonants} tone="purple" />
        </section>

        <section className="mt-7 rounded-[2rem] border border-violet-200 bg-[#eee8f5] p-6 shadow-[0_18px_45px_rgba(61,45,91,0.14)] md:p-9">
          <span className="rounded-full bg-violet-700 px-4 py-2 text-sm font-black text-white">
            Âm căng
          </span>
          <h2 className="mt-4 text-3xl font-black">5 phụ âm đôi</h2>
          <LetterGrid items={doubleConsonants} tone="purple" />
        </section>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl bg-[#10243e] p-7 text-white">
            <p className="text-sm font-black uppercase tracking-widest text-cyan-300">
              Công thức ghép
            </p>
            <p lang="ko" className="font-korean mt-4 text-4xl font-black">
              ㄱ + ㅏ = 가
            </p>
            <p className="mt-3 leading-7 text-slate-300">
              Một âm tiết luôn được xếp thành khối vuông: phụ âm đầu + nguyên
              âm, và có thể thêm phụ âm cuối.
            </p>
          </article>
          <article className="rounded-3xl border border-sky-200 bg-white p-7">
            <p className="text-sm font-black uppercase tracking-widest text-[#087eba]">
              Cách học
            </p>
            <h2 className="mt-3 text-2xl font-black">
              Nhìn chữ → đọc âm → đọc từ mẫu
            </h2>
            <p className="mt-3 leading-7 text-[#65758b]">
              Lặp lại mỗi chữ ba lần và che phần phiên âm khi bạn đã quen mặt
              chữ.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
