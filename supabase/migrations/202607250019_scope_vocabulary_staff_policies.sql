alter policy "Editors manage vocabulary meanings"
on public.vocabulary_meanings
to authenticated;

alter policy "Editors manage vocabulary answers"
on public.vocabulary_accepted_answers
to authenticated;

alter policy "Editors manage vocabulary examples"
on public.vocabulary_examples
to authenticated;

alter policy "Editors manage lesson vocabulary"
on public.lesson_vocabulary
to authenticated;
