import Image from "next/image";
import Link from "next/link";
import { LandingMotion } from "./landing-motion";

const problems = [
  ["✕", "Không biết bắt đầu từ đâu", "Quá nhiều từ và mẫu câu, không biết học phần nào trước."],
  ["!", "Học nhưng nhanh quên", "Học trước quên sau, từ vựng không đọng lại lâu."],
  ["✓", "Ngữ pháp khó hiểu", "Biết công thức nhưng không hiểu cách dùng trong câu."],
  ["✦", "Thiếu động lực", "Tự học dễ nản vì không có lộ trình rõ ràng đồng hành."],
];

const features = [
  ["⌘", "Lộ trình cá nhân hóa", "Học từ vựng và ngữ pháp theo đúng trình độ TOPIK của bạn."],
  ["▤", "Từ vựng dễ nhớ", "Học theo chủ đề, hình ảnh, phát âm và câu ví dụ thực tế."],
  ["▣", "Ngữ pháp dễ hiểu", "Giải thích bằng tiếng Việt, chỉ rõ cách dùng và lỗi dễ nhầm."],
  ["↗", "Thống kê tiến độ", "Theo dõi số từ đã nhớ và các cấu trúc cần ôn lại."],
  ["▯", "Học mọi lúc mọi nơi", "Trải nghiệm liền mạch trên điện thoại, máy tính bảng và laptop."],
  ["♧", "Luyện tập đa dạng", "Flashcard, nghe chép, ghép từ, dịch câu và trắc nghiệm."],
];

const testimonials = [
  ["NP", "Nguyễn Phương", "TOPIK I", "Mình nhớ từ lâu hơn vì mỗi từ đều có ví dụ và được ôn lại đúng lúc."],
  ["TM", "Trần Minh", "TOPIK I", "Phần ngữ pháp giải thích rất dễ hiểu, không còn cảm giác học thuộc công thức."],
  ["KA", "Kim Anh", "TOPIK II", "Bài học ngắn và rõ ràng nên mình có thể duy trì học mỗi ngày."],
  ["LH", "Lê Hoàng", "TOPIK I", "Ứng dụng thân thiện, học mọi lúc mọi nơi và tiến độ rất dễ theo dõi."],
];

const faqs = [
  ["Harutopik phù hợp với ai?", "Harutopik phù hợp với người mới bắt đầu và người đang xây lại nền từ vựng, ngữ pháp để luyện TOPIK."],
  ["Tôi có thể học miễn phí không?", "Có. Bạn có thể tạo tài khoản và trải nghiệm các bài học mở trước khi nâng cấp."],
  ["Harutopik có giúp tôi đạt TOPIK không?", "Harutopik giúp bạn xây nền từ vựng, ngữ pháp và luyện tập theo lộ trình bám sát TOPIK."],
  ["Lộ trình học được cá nhân hóa như thế nào?", "Tiến độ học và kết quả luyện tập giúp hệ thống xác định nội dung bạn nên học hoặc ôn tiếp."],
  ["Tôi có thể học trên những thiết bị nào?", "Bạn có thể học trên trình duyệt điện thoại, máy tính bảng và máy tính."],
  ["Làm sao để liên hệ hỗ trợ?", "Bạn có thể liên hệ qua thông tin ở cuối trang. Kênh hỗ trợ chính thức sẽ được cập nhật sau."],
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-[#10243e]">
      <LandingMotion />
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 shadow-[0_4px_20px_rgba(16,36,62,.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/gioi-thieu" className="flex items-center gap-2 font-black">
            <Image src="/harutopik-mascot-transparent.png" alt="" width={54} height={54} className="brand-mascot h-12 w-12 object-contain" />
            <span className="brand-name">Harutopik</span>
          </Link>
          <nav aria-label="Điều hướng landing page" className="hidden items-center gap-10 text-sm font-semibold text-slate-600 md:flex">
            <a href="#tinh-nang" className="hover:text-[#087eba]">Tính năng</a>
            <a href="#lo-trinh" className="hover:text-[#087eba]">Lộ trình</a>
            <a href="#faq" className="hover:text-[#087eba]">FAQ</a>
          </nav>
          <Link href="/dang-ky" className="landing-cta rounded-full bg-[#087eba] px-5 py-2.5 text-sm font-black text-white shadow-[0_6px_16px_rgba(8,126,186,.2)]">Đăng ký sớm</Link>
        </div>
      </header>

      <section className="landing-hero relative overflow-hidden border-b border-cyan-50">
        <div className="landing-dot-grid absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 sm:px-8 md:py-16 lg:grid-cols-2">
          <div data-reveal="left">
            <p className="hero-piece hero-kicker inline-flex rounded-full border border-cyan-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[.12em] text-[#087eba] shadow-[0_6px_18px_rgba(8,126,186,.1)]">Ứng dụng học từ vựng &amp; ngữ pháp cho người Việt</p>
            <h1 className="mt-5 text-[clamp(1.75rem,4vw,3.8rem)] font-black leading-[1.08] tracking-[-.05em]">
              <span className="hero-piece hero-title-one block whitespace-nowrap">Nhớ từ vựng lâu hơn,</span>
              <span className="hero-piece hero-title-two block whitespace-nowrap"><span className="text-gradient-brand">hiểu ngữ pháp</span> dễ dàng!</span>
            </h1>
            <p className="hero-piece hero-copy mt-5 max-w-xl text-base font-medium leading-7 text-slate-600">
              Harutopik giúp bạn học tiếng Hàn hiệu quả với từ vựng theo ngữ cảnh, ngữ pháp giải thích bằng tiếng Việt và bài luyện tập bám sát TOPIK.
            </p>
            <div className="hero-piece hero-actions mt-7 flex flex-wrap items-center gap-4">
              <Link href="/courses/topik-1" className="landing-cta rounded-full bg-[#087eba] px-7 py-3.5 font-black text-white shadow-[0_8px_20px_rgba(8,126,186,.25)]">Bắt đầu học ngay →</Link>
              <a href="#tinh-nang" className="px-3 py-3 font-black text-[#10243e]">Khám phá Harutopik ↓</a>
            </div>
            <div className="hero-piece hero-meta mt-7 flex flex-wrap items-center gap-7 text-xs font-semibold text-slate-500">
              <span>● Học thử miễn phí</span>
              <span className="text-amber-500">★★★★★ <b className="ml-1 text-[#10243e]">4.9/5</b></span>
              <span>15 phút mỗi ngày</span>
            </div>
          </div>

          <div data-reveal="right" className="relative mx-auto flex min-h-[410px] w-full max-w-2xl items-center justify-center">
            <div className="hero-orbit absolute h-80 w-80 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 shadow-[0_20px_60px_rgba(8,126,186,.12)]" />
            <Image src="/harutopik-wink-left.png" alt="Haru - người bạn đồng hành học tiếng Hàn" width={768} height={512} preload sizes="(max-width: 639px) 22rem, 31rem" className="landing-mascot relative z-10 h-auto w-[22rem] drop-shadow-2xl sm:w-[31rem]" />
            <div className="landing-float-badge badge-one absolute left-0 top-4 z-20 rounded-2xl border border-white bg-white/90 px-5 py-4 text-center text-sm font-black shadow-xl sm:-left-5 sm:top-2"><strong>15 phút <span className="font-black">mỗi ngày</span></strong></div>
            <div className="landing-float-badge badge-two absolute right-0 top-7 z-20 rounded-2xl border border-white bg-white/90 px-5 py-4 text-center shadow-xl sm:-right-10 sm:top-4"><strong className="font-korean text-[#087eba]">오늘도 화이팅!</strong><span className="block font-bold text-slate-600">Cố lên hôm nay!</span></div>
            <div className="landing-float-badge badge-three absolute bottom-4 left-0 z-20 min-w-[220px] rounded-2xl border border-white bg-white/90 px-5 py-4 text-sm shadow-xl sm:-left-8"><strong className="block whitespace-nowrap text-[.8rem]">🎯 Từ vựng theo ngữ cảnh</strong></div>
            <div className="landing-float-badge badge-four absolute bottom-4 right-0 z-20 min-w-[190px] rounded-2xl border border-white bg-white/90 px-5 py-4 text-sm shadow-xl sm:-right-8"><strong className="block whitespace-nowrap text-[.8rem]">▤ Ngữ pháp dễ hiểu</strong></div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12">
        <div data-reveal="up" className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-black">Bạn có đang gặp những vấn đề này?</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map(([icon, title, text], index) => (
              <article key={title} className="landing-card rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_28px_rgba(16,36,62,.055)]">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-black ${["bg-rose-50 text-rose-500", "bg-amber-50 text-amber-500", "bg-emerald-50 text-emerald-500", "bg-violet-50 text-violet-500"][index]}`}>{icon}</span>
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="tinh-nang" className="scroll-mt-20 bg-[#fbfdff] py-10 md:py-12">
        <div data-reveal="up" className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-black">Tính năng nổi bật</h2>
          <p className="mt-2 text-center text-sm font-semibold text-slate-500">Tập trung vào hai nền tảng quan trọng nhất: từ vựng và ngữ pháp</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {features.map(([icon, title, text], index) => (
              <article key={title} className="landing-card rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_6px_24px_rgba(16,36,62,.045)]">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${["bg-lime-50 text-lime-600", "bg-violet-50 text-violet-600", "bg-cyan-50 text-cyan-600", "bg-amber-50 text-amber-600", "bg-blue-50 text-blue-600", "bg-fuchsia-50 text-fuchsia-600"][index]}`}>{icon}</span>
                <h3 className="mt-4 text-sm font-black">{title}</h3>
                <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="lo-trinh" className="scroll-mt-20 py-11 md:py-14">
        <div data-reveal="up" className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-black">Lộ trình học TOPIK</h2>
          <p className="mt-2 text-center text-sm font-semibold text-slate-500">Từ nền tảng từ vựng, ngữ pháp đến luyện thi TOPIK</p>
          <div className="relative mt-9 grid gap-5 md:grid-cols-[.7fr_1fr_1fr_1fr_.7fr]">
            <div className="absolute left-[8%] right-[8%] top-9 hidden h-0.5 bg-[#20a9d8] md:block" />
            {[
              ["🐧", "Làm quen tiếng Hàn", "Bảng chữ cái và phát âm cơ bản"],
              ["1", "Xây vốn từ", "Từ vựng theo chủ đề và ngữ cảnh"],
              ["2", "Nắm ngữ pháp", "Cấu trúc sơ cấp và cách dùng"],
              ["3", "Luyện thi TOPIK", "Ôn tập và làm quen dạng đề"],
              ["🏆", "Chinh phục mục tiêu", "Tự tin sử dụng kiến thức"],
            ].map(([icon, title, text]) => (
              <article key={title} className="relative text-center">
                <span className="landing-step relative z-10 mx-auto flex h-18 w-18 items-center justify-center rounded-full border border-cyan-200 bg-[#f2fbff] text-2xl font-black text-[#087eba]">{icon}</span>
                <h3 className="mt-4 text-sm font-black">{title}</h3>
                <p className="mx-auto mt-2 max-w-40 text-xs font-medium leading-5 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fbfdff] py-10 md:py-12">
        <div data-reveal="up" className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-black">Học viên nói gì về Harutopik?</h2>
          <div className="landing-testimonial-marquee mt-7" aria-label="Đánh giá của học viên">
            <div className="landing-testimonial-track">
              {[0, 1].flatMap((copy) => testimonials.map(([initials, name, level, quote], index) => (
                <article key={`${name}-${copy}`} className="testimonial-card rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_6px_24px_rgba(16,36,62,.04)]">
                  <p className="text-sm font-medium leading-6 text-slate-600">“{quote}”</p>
                  <div className="mt-5 flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white ${["bg-rose-400", "bg-blue-500", "bg-emerald-500", "bg-violet-500"][index]}`}>{initials}</span><div><h3 className="text-sm font-black">{name}</h3><p className="text-xs font-semibold text-slate-400">{level}</p></div></div>
                </article>
              )))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 py-10 md:py-12">
        <div data-reveal="up" className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-black">Câu hỏi thường gặp</h2>
          <div className="mt-7 grid gap-x-10 md:grid-cols-2">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group border-b border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-black">{question}<span className="text-lg text-[#087eba] transition group-open:rotate-45">+</span></summary>
                <p className="pb-4 text-sm font-medium leading-6 text-slate-500">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-10 sm:px-8">
        <div data-reveal="up" className="mx-auto grid max-w-7xl items-center gap-5 rounded-2xl border border-cyan-200 bg-[#f2fbff] px-6 py-5 md:grid-cols-[auto_1fr_1.1fr]">
          <div className="relative h-24 w-28 sm:h-28 sm:w-32"><Image src="/harutopik-megaphone.png" alt="Haru thông báo đăng ký sớm" width={180} height={150} unoptimized className="absolute inset-0 h-full w-full scale-[1.65] object-contain drop-shadow-lg" /></div>
          <div><h2 className="text-xl font-black">Đăng ký sớm để nhận ưu đãi đặc biệt!</h2><p className="mt-1 text-sm font-medium text-slate-500">Nhận thông tin mới nhất khi Harutopik ra mắt.</p></div>
          <form className="flex gap-2" action="/dang-ky"><label htmlFor="early-contact" className="sr-only">Email hoặc số điện thoại của bạn</label><input id="early-contact" name="contact" type="text" placeholder="Email hoặc số điện thoại của bạn" className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm outline-none focus:border-[#087eba]" /><button className="shrink-0 rounded-full bg-[#087eba] px-5 py-3 text-sm font-black text-white">Đăng ký sớm →</button></form>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-9 text-sm sm:px-8 md:grid-cols-4">
          <div><div className="flex items-center gap-2 font-black"><Image src="/harutopik-logo-transparent.png" alt="" width={36} height={36} className="h-9 w-9 object-contain" />Harutopik</div><p className="mt-3 text-xs font-medium leading-5 text-slate-500">Ứng dụng học từ vựng và ngữ pháp tiếng Hàn dành cho người Việt.</p></div>
          <div><h2 className="font-black">Liên hệ</h2><p className="mt-3 text-xs text-slate-500">hello@harutopik.vn</p><p className="mt-2 text-xs text-slate-500">Thông tin hỗ trợ sẽ cập nhật</p></div>
          <div><h2 className="font-black">Kết nối với chúng tôi</h2><p className="mt-3 font-black text-[#087eba]">Facebook · TikTok · YouTube</p></div>
          <div><p className="text-xs font-semibold text-slate-400">© 2026 Harutopik. All rights reserved.</p><p className="mt-3 text-xs text-slate-500">Chính sách bảo mật</p><p className="mt-2 text-xs text-slate-500">Điều khoản sử dụng</p></div>
        </div>
      </footer>
    </main>
  );
}
