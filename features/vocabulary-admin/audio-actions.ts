"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAzureTtsConfigured } from "@/lib/audio/config";
import {
  generateVocabularyAudioForActor,
  VocabularyAudioError,
} from "@/lib/audio/service";
import { requirePermission } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";

function resultUrl(vocabularyId: string, result: string) {
  return `/bien-tap/tu-vung/${vocabularyId}?audio=${result}`;
}

export async function generateVocabularyAudio(formData: FormData) {
  const actor = await requirePermission("content:edit");
  const vocabularyId = formData.get("vocabularyId");
  if (typeof vocabularyId !== "string" || !vocabularyId) {
    redirect("/bien-tap/tu-vung");
  }
  if (!isAzureTtsConfigured()) {
    redirect(resultUrl(vocabularyId, "not-configured"));
  }

  const supabase = await createClient();
  try {
    const result = await generateVocabularyAudioForActor({
      vocabularyId,
      actorId: actor.id,
      actorRoles: actor.roles,
      supabase,
    });
    revalidatePath("/bien-tap/tu-vung");
    revalidatePath(`/bien-tap/tu-vung/${vocabularyId}`);
    redirect(
      resultUrl(
        vocabularyId,
        result.status === "processing"
          ? "processing"
          : result.cached
            ? "reused"
            : "generated",
      ),
    );
  } catch (error) {
    if (error instanceof VocabularyAudioError) {
      redirect(
        resultUrl(
          vocabularyId,
          error.status === 403 ? "forbidden" : "failed",
        ),
      );
    }
    throw error;
  }
}
