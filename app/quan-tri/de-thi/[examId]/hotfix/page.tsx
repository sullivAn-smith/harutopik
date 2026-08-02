import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/authorize";
import { getExamForEditing } from "@/lib/data/exams";
import { ExamEditor } from "@/features/exams/exam-editor";

export default async function ExamHotfixPage({ params }: { params: Promise<{ examId: string }> }) {
  await requirePermission("content:publish");
  const { examId } = await params;
  const exam = await getExamForEditing(examId);
  if (!exam || exam.status !== "published") notFound();
  return <ExamEditor exam={exam} hotfix />;
}
