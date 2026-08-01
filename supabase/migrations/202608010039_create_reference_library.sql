create table public.reference_sets (
  id text primary key,
  slug text not null unique,
  title_vi text not null,
  title_ko text not null,
  description text not null,
  category text not null default 'foundation',
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reference_items (
  id text primary key,
  reference_set_id text not null references public.reference_sets(id) on delete cascade,
  value_label text not null,
  korean text not null,
  romanization text not null,
  note_vi text,
  short_form text,
  audio_url text,
  group_key text not null default 'basic',
  order_index integer not null check (order_index > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reference_set_id, order_index)
);

create table public.lesson_reference_sets (
  lesson_id text not null references public.content_entries(id) on delete cascade,
  reference_set_id text not null references public.reference_sets(id) on delete cascade,
  order_index integer not null default 1 check (order_index > 0),
  primary key (lesson_id, reference_set_id)
);

create index reference_items_set_group_order_idx
  on public.reference_items(reference_set_id, group_key, order_index);

alter table public.reference_sets enable row level security;
alter table public.reference_items enable row level security;
alter table public.lesson_reference_sets enable row level security;

create policy "Anyone reads published reference sets"
on public.reference_sets for select
using (status = 'published');

create policy "Staff reads all reference sets"
on public.reference_sets for select to authenticated
using (public.has_app_role(array['content_editor','admin']::public.app_role[]));

create policy "Staff creates reference sets"
on public.reference_sets for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Owners and admins update reference sets"
on public.reference_sets for update to authenticated
using (
  created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
)
with check (
  created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
);

create policy "Owners and admins delete reference sets"
on public.reference_sets for delete to authenticated
using (
  created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
);

create policy "Anyone reads items of published sets"
on public.reference_items for select
using (
  exists (
    select 1 from public.reference_sets sets
    where sets.id = reference_set_id and sets.status = 'published'
  )
);

create policy "Staff reads all reference items"
on public.reference_items for select to authenticated
using (public.has_app_role(array['content_editor','admin']::public.app_role[]));

create policy "Staff manages reference items"
on public.reference_items for all to authenticated
using (
  exists (
    select 1 from public.reference_sets sets
    where sets.id = reference_set_id
      and (
        sets.created_by = (select auth.uid())
        or public.has_app_role(array['admin']::public.app_role[])
      )
  )
)
with check (
  exists (
    select 1 from public.reference_sets sets
    where sets.id = reference_set_id
      and (
        sets.created_by = (select auth.uid())
        or public.has_app_role(array['admin']::public.app_role[])
      )
  )
);

create policy "Anyone reads published lesson references"
on public.lesson_reference_sets for select
using (
  exists (
    select 1 from public.reference_sets sets
    where sets.id = reference_set_id and sets.status = 'published'
  )
);

create policy "Staff manages lesson references"
on public.lesson_reference_sets for all to authenticated
using (public.has_app_role(array['content_editor','admin']::public.app_role[]))
with check (public.has_app_role(array['content_editor','admin']::public.app_role[]));

grant select on public.reference_sets, public.reference_items, public.lesson_reference_sets
  to anon, authenticated;
grant insert, update, delete on public.reference_sets, public.reference_items, public.lesson_reference_sets
  to authenticated;

insert into public.reference_sets (
  id, slug, title_vi, title_ko, description, category, status
)
values
  ('native-korean-numbers', 'so-thuan-han', 'Số thuần Hàn', '고유어 수', 'Dùng khi đếm đồ vật, nói tuổi và nói giờ.', 'numbers', 'published'),
  ('sino-korean-numbers', 'so-han-han', 'Số Hán Hàn', '한자어 수', 'Dùng cho ngày tháng, tiền, số điện thoại và phút.', 'numbers', 'published')
on conflict (id) do update set
  title_vi = excluded.title_vi,
  title_ko = excluded.title_ko,
  description = excluded.description,
  category = excluded.category,
  status = excluded.status,
  updated_at = now();

insert into public.reference_items
  (id, reference_set_id, value_label, korean, romanization, note_vi, short_form, group_key, order_index)
values
  ('native-1', 'native-korean-numbers', '1', '하나', 'hana', 'Dạng đứng trước đơn vị đếm', '한', 'basic', 1),
  ('native-2', 'native-korean-numbers', '2', '둘', 'dul', 'Dạng đứng trước đơn vị đếm', '두', 'basic', 2),
  ('native-3', 'native-korean-numbers', '3', '셋', 'set', 'Dạng đứng trước đơn vị đếm', '세', 'basic', 3),
  ('native-4', 'native-korean-numbers', '4', '넷', 'net', 'Dạng đứng trước đơn vị đếm', '네', 'basic', 4),
  ('native-5', 'native-korean-numbers', '5', '다섯', 'daseot', null, null, 'basic', 5),
  ('native-6', 'native-korean-numbers', '6', '여섯', 'yeoseot', null, null, 'basic', 6),
  ('native-7', 'native-korean-numbers', '7', '일곱', 'ilgop', null, null, 'basic', 7),
  ('native-8', 'native-korean-numbers', '8', '여덟', 'yeodeol', null, null, 'basic', 8),
  ('native-9', 'native-korean-numbers', '9', '아홉', 'ahop', null, null, 'basic', 9),
  ('native-10', 'native-korean-numbers', '10', '열', 'yeol', null, null, 'basic', 10),
  ('native-20', 'native-korean-numbers', '20', '스물', 'seumul', 'Dạng đứng trước đơn vị đếm', '스무', 'tens', 11),
  ('native-30', 'native-korean-numbers', '30', '서른', 'seoreun', null, null, 'tens', 12),
  ('native-40', 'native-korean-numbers', '40', '마흔', 'maheun', null, null, 'tens', 13),
  ('native-50', 'native-korean-numbers', '50', '쉰', 'swin', null, null, 'tens', 14),
  ('native-60', 'native-korean-numbers', '60', '예순', 'yesun', null, null, 'tens', 15),
  ('native-70', 'native-korean-numbers', '70', '일흔', 'ilheun', null, null, 'tens', 16),
  ('native-80', 'native-korean-numbers', '80', '여든', 'yeodeun', null, null, 'tens', 17),
  ('native-90', 'native-korean-numbers', '90', '아흔', 'aheun', null, null, 'tens', 18),
  ('sino-0', 'sino-korean-numbers', '0', '영 / 공', 'yeong / gong', '공 thường dùng khi đọc số điện thoại', null, 'basic', 1),
  ('sino-1', 'sino-korean-numbers', '1', '일', 'il', null, null, 'basic', 2),
  ('sino-2', 'sino-korean-numbers', '2', '이', 'i', null, null, 'basic', 3),
  ('sino-3', 'sino-korean-numbers', '3', '삼', 'sam', null, null, 'basic', 4),
  ('sino-4', 'sino-korean-numbers', '4', '사', 'sa', null, null, 'basic', 5),
  ('sino-5', 'sino-korean-numbers', '5', '오', 'o', null, null, 'basic', 6),
  ('sino-6', 'sino-korean-numbers', '6', '육', 'yuk', null, null, 'basic', 7),
  ('sino-7', 'sino-korean-numbers', '7', '칠', 'chil', null, null, 'basic', 8),
  ('sino-8', 'sino-korean-numbers', '8', '팔', 'pal', null, null, 'basic', 9),
  ('sino-9', 'sino-korean-numbers', '9', '구', 'gu', null, null, 'basic', 10),
  ('sino-10', 'sino-korean-numbers', '10', '십', 'sip', null, null, 'units', 11),
  ('sino-100', 'sino-korean-numbers', '100', '백', 'baek', null, null, 'units', 12),
  ('sino-1000', 'sino-korean-numbers', '1.000', '천', 'cheon', null, null, 'units', 13),
  ('sino-10000', 'sino-korean-numbers', '10.000', '만', 'man', null, null, 'units', 14),
  ('sino-100000000', 'sino-korean-numbers', '100 triệu', '억', 'eok', null, null, 'units', 15)
on conflict (id) do update set
  value_label = excluded.value_label,
  korean = excluded.korean,
  romanization = excluded.romanization,
  note_vi = excluded.note_vi,
  short_form = excluded.short_form,
  group_key = excluded.group_key,
  order_index = excluded.order_index,
  updated_at = now();
