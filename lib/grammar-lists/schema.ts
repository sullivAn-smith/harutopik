import { z } from "zod";
import { grammarPointSchema } from "@/content/schema";

export const GRAMMAR_LIST_PREFIX = "#grammar:";
export const GRAMMAR_FAVORITES_STORAGE_NAME = `${GRAMMAR_LIST_PREFIX}favorites`;
export const GRAMMAR_FAVORITES_NAME = "Ngữ pháp yêu thích";

export function grammarListStorageName(name: string) {
  return `${GRAMMAR_LIST_PREFIX}${name.trim()}`;
}

export function grammarListDisplayName(name: string) {
  return name === GRAMMAR_FAVORITES_STORAGE_NAME
    ? GRAMMAR_FAVORITES_NAME
    : name.startsWith(GRAMMAR_LIST_PREFIX)
      ? name.slice(GRAMMAR_LIST_PREFIX.length)
      : name;
}

export const createGrammarListSchema = z.object({ name: z.string().trim().min(2).max(50) });
export const updateGrammarListSchema = createGrammarListSchema;
export const saveGrammarItemSchema = z.object({
  grammarId: z.string().min(1).max(200),
  lessonId: z.string().min(1).max(200),
  item: grammarPointSchema,
});
export type GrammarListSummary = {
  id: string;
  name: string;
  kind: "favorites" | "custom";
  itemCount: number;
  items?: Array<{ grammarId: string; lessonId: string; item: z.infer<typeof grammarPointSchema>; createdAt: string }>;
};
