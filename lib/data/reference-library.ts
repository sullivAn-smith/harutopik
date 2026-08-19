import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

export const referenceLibraryCacheTag = "published-reference-library";
const referenceLibraryCacheSeconds = 86_400;

export type ReferenceItem = {
  id: string;
  valueLabel: string;
  korean: string;
  romanization: string;
  noteVi?: string;
  shortForm?: string;
  audioUrl?: string;
  groupKey: string;
  orderIndex: number;
};

export type ReferenceSet = {
  id: string;
  slug: string;
  titleVi: string;
  titleKo: string;
  description: string;
  category: string;
  items: ReferenceItem[];
};

type ReferenceSetRow = {
  id: string;
  slug: string;
  title_vi: string;
  title_ko: string;
  description: string;
  category: string;
};

type ReferenceItemRow = {
  id: string;
  reference_set_id: string;
  value_label: string;
  korean: string;
  romanization: string;
  note_vi: string | null;
  short_form: string | null;
  audio_url: string | null;
  group_key: string;
  order_index: number;
};

function publicClient() {
  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapSet(row: ReferenceSetRow, items: ReferenceItemRow[]): ReferenceSet {
  return {
    id: row.id,
    slug: row.slug,
    titleVi: row.title_vi,
    titleKo: row.title_ko,
    description: row.description,
    category: row.category,
    items: items
      .filter((item) => item.reference_set_id === row.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((item) => ({
        id: item.id,
        valueLabel: item.value_label,
        korean: item.korean,
        romanization: item.romanization,
        ...(item.note_vi ? { noteVi: item.note_vi } : {}),
        ...(item.short_form ? { shortForm: item.short_form } : {}),
        ...(item.audio_url ? { audioUrl: item.audio_url } : {}),
        groupKey: item.group_key,
        orderIndex: item.order_index,
      })),
  };
}

async function loadPublishedReferenceSetSummaries(): Promise<Omit<ReferenceSet, "items">[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = publicClient();
  const { data: sets, error: setsError } = await supabase
    .from("reference_sets")
    .select("id,slug,title_vi,title_ko,description,category")
    .eq("status", "published")
    .order("created_at");

  if (setsError || !sets?.length) return [];
  return (sets as ReferenceSetRow[]).map((set) => ({
    id: set.id,
    slug: set.slug,
    titleVi: set.title_vi,
    titleKo: set.title_ko,
    description: set.description,
    category: set.category,
  }));
}

const getReferenceSetSummariesAcrossRequests = unstable_cache(
  loadPublishedReferenceSetSummaries,
  ["published-reference-set-summaries-v1"],
  { tags: [referenceLibraryCacheTag], revalidate: referenceLibraryCacheSeconds },
);

export const getPublishedReferenceSetSummaries = cache(
  getReferenceSetSummariesAcrossRequests,
);

async function loadPublishedReferenceSet(slug: string): Promise<ReferenceSet | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = publicClient();
  const { data: set, error: setError } = await supabase
    .from("reference_sets")
    .select("id,slug,title_vi,title_ko,description,category")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (setError || !set) return null;
  const { data: items, error: itemsError } = await supabase
    .from("reference_items")
    .select("id,reference_set_id,value_label,korean,romanization,note_vi,short_form,audio_url,group_key,order_index")
    .eq("reference_set_id", set.id)
    .order("order_index");

  if (itemsError) return null;
  return mapSet(set as ReferenceSetRow, (items ?? []) as ReferenceItemRow[]);
}

const getReferenceSetAcrossRequests = unstable_cache(
  loadPublishedReferenceSet,
  ["published-reference-set-v1"],
  { tags: [referenceLibraryCacheTag], revalidate: referenceLibraryCacheSeconds },
);

export const getPublishedReferenceSet = cache(getReferenceSetAcrossRequests);
