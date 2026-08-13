export default function CurriculumSeriesLoading() {
  return (
    <main className="elegant-blue min-h-screen px-5 py-8 text-[#10243e] md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl animate-pulse">
        <div className="h-10 w-36 rounded-full bg-white/55" />
        <div className="mt-7 h-40 rounded-[2rem] bg-white/45" />
        <div className="mt-7 space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 rounded-[1.75rem] bg-white/45" />
          ))}
        </div>
      </div>
    </main>
  );
}
