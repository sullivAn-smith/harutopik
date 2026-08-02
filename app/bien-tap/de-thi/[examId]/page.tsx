import { notFound } from "next/navigation";
import { ExamEditor } from "@/features/exams/exam-editor";
import { getExamForEditing } from "@/lib/data/exams";

export default async function EditExamPage({ params, searchParams }: { params: Promise<{ examId: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ examId }, notice] = await Promise.all([params, searchParams]);
  const exam = await getExamForEditing(examId);
  if (!exam) notFound();
  return <ExamEditor exam={exam} error={notice.error} />;
}
