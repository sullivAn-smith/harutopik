export const plans = {
  free: {
    id: "00000000-0000-4000-8000-000000000001",
    code: "free",
    name: "Haru Free",
    price: 0,
    currency: "VND",
    features: ["Bài học nhập môn", "Flashcard cơ bản", "Theo dõi tiến độ"],
  },
  proAnnual: {
    id: "00000000-0000-4000-8000-000000000002",
    priceId: "00000000-0000-4000-8000-000000000012",
    code: "pro",
    name: "Haru Pro 12 tháng",
    price: 499_000,
    currency: "VND",
    durationDays: 365,
    features: [
      "Toàn bộ khóa học TOPIK",
      "SRS và luyện tập không giới hạn",
      "Đồng bộ web và ứng dụng",
      "Lộ trình và thống kê chuyên sâu",
    ],
  },
} as const;

export function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
