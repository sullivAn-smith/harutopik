import { notFound } from "next/navigation";
import { ExamEditor } from "@/features/exams/exam-editor";
import { getExamForEditing, getExamRevisionHistory } from "@/lib/data/exams";

export default async function EditExamPage({ params, searchParams }: { params: Promise<{ examId: string }>; searchParams: Promise<{ error?: string; section?: string }> }) {
  const [{ examId }, notice] = await Promise.all([params, searchParams]);
  const [exam, history] = await Promise.all([getExamForEditing(examId), getExamRevisionHistory(examId)]);
  if (!exam) notFound();
  return <ExamEditor exam={exam} error={notice.error} initialSection={notice.section === "reading" ? "reading" : "listening"} history={history} />;
}
