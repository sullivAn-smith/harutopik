import type { Metadata } from "next";
import { LearningRoadmap } from "@/features/roadmap/learning-roadmap";

export const metadata: Metadata = {
  title: "Lộ trình học tiếng Hàn",
  description: "Chọn lộ trình TOPIK, Seoul hoặc Sejong phù hợp với mục tiêu học tiếng Hàn của bạn.",
};

export default function LearningRoadmapPage() {
  return <LearningRoadmap />;
}
