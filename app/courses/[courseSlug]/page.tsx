import { redirect } from "next/navigation";
import { getCourseParams } from "@/content/catalog";

type CoursePageProps = {
  params: Promise<{ courseSlug: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return getCourseParams();
}

/**
 * Trang danh sách khóa học cũ đã được thay bằng thư viện giáo trình mới.
 * Giữ route này làm cầu nối để bookmark và đường dẫn cũ không bị 404.
 */
export default async function CoursePage({ params }: CoursePageProps) {
  await params;
  redirect("/thu-vien/1");
}
