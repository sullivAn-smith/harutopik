type VocabularyReference = {
  id: string;
};

export function planPublishedLessonVocabularyRemoval<
  T extends VocabularyReference,
>(vocabulary: readonly T[], requestedRemovalIds: readonly string[]) {
  const vocabularyIds = new Set(vocabulary.map((item) => item.id));
  const removedVocabularyIds = [...new Set(requestedRemovalIds)];
  const invalidVocabularyIds = removedVocabularyIds.filter(
    (id) => !vocabularyIds.has(id),
  );

  if (invalidVocabularyIds.length > 0) {
    return {
      retainedVocabulary: [...vocabulary],
      removedVocabularyIds,
      invalidVocabularyIds,
    };
  }

  const removedVocabularyIdSet = new Set(removedVocabularyIds);
  return {
    retainedVocabulary: vocabulary.filter(
      (item) => !removedVocabularyIdSet.has(item.id),
    ),
    removedVocabularyIds,
    invalidVocabularyIds,
  };
}
