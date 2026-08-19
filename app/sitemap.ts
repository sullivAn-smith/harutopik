import type { MetadataRoute } from "next";
import { courses, coursePath, lessonPath } from "@/content/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://harutopik.com";
  const staticPages = ["", "/hangul", "/lo-trinh", "/luyen-de", "/nang-cap", "/tro-ly"];
  const coursePages = courses.flatMap((course) => [
    coursePath(course),
    ...course.lessons
      .filter((lesson) => lesson.status === "published")
      .map((lesson) => lessonPath(course, lesson)),
  ]);

  return [...staticPages, ...coursePages].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date("2026-07-24"),
    changeFrequency: path.includes("/lessons/") ? "monthly" : "weekly",
    priority: path === "" ? 1 : path.includes("/lessons/") ? 0.7 : 0.8,
  }));
}
