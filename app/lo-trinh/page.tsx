import type { Metadata } from "next";
import { LearningRoadmap } from "@/features/roadmap/learning-roadmap";

export const metadata: Metadata = {
  title: "Lộ trình học tiếng Hàn",
  description: "Lộ trình cho người mới học tiếng Hàn: học Hangul, theo giáo trình, lưu từ vựng và luyện phản xạ bằng Speed Test.",
};

export default function LearningRoadmapPage() {
  return <LearningRoadmap />;
}
