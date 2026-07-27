# Harutopik — Tài liệu hệ thống và luồng nghiệp vụ

## 1. Mục đích tài liệu

Tài liệu này mô tả:

- kiến trúc hiện tại của Harutopik;
- ba role đang sử dụng trong giai đoạn này;
- quyền của từng role;
- cách tạo tài khoản để kiểm thử role;
- routing sau đăng nhập;
- luồng biên soạn, duyệt, phát hành và học bài;
- dữ liệu được lưu ở đâu;
- checklist kiểm thử thủ công.

## 2. Kiến trúc tổng quan

```text
Next.js website
├── Learner UI
├── Content Studio
├── Admin Center
├── Server Actions
└── API /api/v1/*
        │
        ▼
Supabase
├── Auth
├── PostgreSQL
├── Row Level Security
└── Object Storage (để dành cho media)
```

Website và ứng dụng mobile sau này dùng chung:

- Supabase Auth;
- database;
- catalog đã phát hành;
- tiến độ học;
- SRS;
- danh sách từ;
- API nghiệp vụ.

## 3. Ba role đang kiểm thử

### 3.1 Learner

Role mặc định của mọi tài khoản mới.

Được phép:

- xem và học bài đã phát hành;
- làm flashcard, quiz, nối từ, dịch và chính tả;
- lưu và phục hồi phiên học;
- quản lý hồ sơ cá nhân;
- quản lý danh sách từ;
- xem tiến độ và SRS của chính mình.

Không được phép:

- mở `/bien-tap`;
- mở `/quan-tri`;
- đọc bản nháp;
- tạo, sửa, duyệt hoặc phát hành nội dung.

Trang mặc định sau onboarding:

```text
/tai-khoan
```

### 3.2 Content editor

Được phép:

- tạo bài học ở trạng thái `draft`;
- sửa bài do chính mình tạo khi còn `draft` hoặc `changes_requested`;
- tạo và sửa từ vựng bản nháp của chính mình;
- import CSV/XLSX;
- chọn từ vào bài;
- nhập ngữ pháp và câu ví dụ;
- xem Eligibility Report;
- gửi bài sang `in_review`.

Không được phép:

- phê duyệt;
- publish hoặc unpublish;
- tạo course/module;
- quản lý role;
- xem nội dung quản trị hệ thống.

Trang mặc định sau onboarding:

```text
/bien-tap
```

### 3.3 Admin

Được phép:

- toàn bộ quyền của content editor;
- xem tất cả bản nội dung;
- duyệt hoặc yêu cầu sửa;
- phát hành và tạm gỡ;
- tạo course/module;
- xem audit log ở tầng dữ liệu;
- quản lý role ở tầng database.

Trang mặc định sau onboarding:

```text
/quan-tri
```

## 4. Role là quyền cộng dồn

Mỗi tài khoản có thể có nhiều dòng trong `public.user_roles`.

Ví dụ content editor thông thường có thể đồng thời có:

```text
learner
content_editor
```

Khi đó quyền là hợp của cả hai role. Thứ tự redirect sau đăng nhập:

```text
admin → /quan-tri
content_editor → /bien-tap
còn lại → /tai-khoan
```

Nếu onboarding chưa hoàn thành, mọi role đều được đưa tới:

```text
/bat-dau
```

Đây là hành vi đúng, không phải lỗi role.

## 5. Cách tạo tài khoản kiểm thử

Nên dùng ba tài khoản riêng:

```text
learner-test@...
editor-test@...
admin-test@...
```

Không nên liên tục đổi role trên một tài khoản đang đăng nhập vì cookie và
Server Component cache có thể khiến việc quan sát khó hiểu.

### Cách tạo nhanh

1. Mở Supabase Dashboard.
2. Chọn `Authentication`.
3. Chọn `Users`.
4. Chọn `Add user`.
5. Tạo ba tài khoản email/password.
6. Đăng nhập từng tài khoản và hoàn thành onboarding một lần.

Bạn cũng có thể dùng ba Google account khác nhau. Mỗi Google account tạo một
Supabase user riêng.

## 6. Cách xem user ID

Trong Supabase SQL Editor:

```sql
select
  id,
  email,
  created_at
from auth.users
order by created_at desc;
```

Xem role hiện tại:

```sql
select
  users.email,
  roles.role,
  roles.granted_at
from public.user_roles roles
join auth.users users on users.id = roles.user_id
order by users.email, roles.role;
```

## 7. Gán role content editor

Thay email bằng tài khoản cần test:

```sql
insert into public.user_roles (user_id, role, granted_by)
select
  target.id,
  'content_editor'::public.app_role,
  administrator.id
from auth.users target
cross join lateral (
  select users.id
  from auth.users users
  join public.user_roles roles on roles.user_id = users.id
  where roles.role = 'admin'
  order by roles.granted_at
  limit 1
) administrator
where target.email = 'editor-test@example.com'
on conflict (user_id, role) do nothing;
```

Role `learner` mặc định có thể giữ nguyên.

## 8. Gán role admin

Chỉ thực hiện bằng SQL Editor hoặc một admin hiện có:

```sql
insert into public.user_roles (user_id, role, granted_by)
select
  target.id,
  'admin'::public.app_role,
  administrator.id
from auth.users target
cross join lateral (
  select users.id
  from auth.users users
  join public.user_roles roles on roles.user_id = users.id
  where roles.role = 'admin'
  order by roles.granted_at
  limit 1
) administrator
where target.email = 'admin-test@example.com'
on conflict (user_id, role) do nothing;
```

Nếu đây là admin đầu tiên và chưa có admin làm `granted_by`, dùng:

```sql
insert into public.user_roles (user_id, role, granted_by)
select id, 'admin'::public.app_role, null
from auth.users
where email = 'admin-test@example.com'
on conflict (user_id, role) do nothing;
```

Chỉ dùng câu lệnh thứ hai để bootstrap admin đầu tiên.

## 9. Thu hồi role nâng cao

Đưa tài khoản content editor trở lại learner:

```sql
delete from public.user_roles
where user_id = (
  select id from auth.users where email = 'editor-test@example.com'
)
and role = 'content_editor';
```

Thu hồi admin:

```sql
delete from public.user_roles
where user_id = (
  select id from auth.users where email = 'admin-test@example.com'
)
and role = 'admin';
```

Không xóa role `learner` nếu tài khoản vẫn là người học.

Không thu hồi admin cuối cùng của hệ thống.

## 10. Áp dụng role mới trong trình duyệt

Sau khi gán hoặc thu hồi role:

1. Đăng xuất tài khoản đang test.
2. Đăng nhập lại.
3. Nếu vẫn thấy giao diện cũ, đóng tab hoặc xóa cookie localhost.

Không cần restart Next.js vì role được đọc từ database.

## 11. Cách kiểm tra bảo mật role

Ẩn menu chưa đủ để chứng minh hệ thống an toàn. Cần nhập URL trực tiếp.

### Learner

| Kiểm thử | Kết quả mong đợi |
|---|---|
| Mở `/tai-khoan` | Thành công |
| Mở bài đã publish | Thành công |
| Mở `/bien-tap` | 404/không có quyền |
| Mở `/quan-tri` | 404/không có quyền |

Hệ thống cố ý trả 404 cho route không có quyền để không tiết lộ route quản trị.

### Content editor

| Kiểm thử | Kết quả mong đợi |
|---|---|
| Mở `/bien-tap` | Thành công |
| Tạo bài draft | Thành công |
| Sửa bài của mình | Thành công |
| Import CSV/XLSX | Thành công |
| Gửi duyệt | Thành công nếu đạt quality gate |
| Mở `/quan-tri` | 404/không có quyền |
| Publish trực tiếp | Bị database từ chối |
| Sửa draft của editor khác | Không thấy hoặc bị từ chối |

### Admin

| Kiểm thử | Kết quả mong đợi |
|---|---|
| Mở `/quan-tri` | Thành công |
| Mở hàng chờ duyệt | Thành công |
| Yêu cầu chỉnh sửa | Thành công |
| Phê duyệt | Thành công |
| Phát hành | Thành công |
| Tạm gỡ | Thành công |
| Tạo course/module | Thành công |

## 12. Luồng nghiệp vụ tài khoản

```text
Đăng ký email hoặc Google
→ Supabase tạo auth.users
→ Trigger tạo role learner
→ Trigger tạo learner profile
→ Người dùng hoàn thành onboarding
→ Hệ thống đọc user_roles
→ Redirect theo role
```

## 13. Luồng nghiệp vụ từ vựng

```text
Content editor tạo một từ
→ vocabulary_items: draft
→ thêm nghĩa
→ thêm accepted answers
→ thêm câu ví dụ
→ dùng lại từ trong nhiều bài học
```

Các bảng chính:

```text
vocabulary_items
vocabulary_meanings
vocabulary_accepted_answers
vocabulary_examples
lesson_vocabulary
```

## 14. Luồng import CSV/XLSX

```text
Upload file
→ đọc CSV/XLSX
→ chuẩn hóa dữ liệu
→ kiểm tra trường bắt buộc
→ kiểm tra URL
→ phát hiện trùng trong file
→ phát hiện trùng trong database
→ lưu staging
→ content editor xem preview
→ xác nhận
→ bulk insert các dòng hợp lệ thành draft
```

Các bảng staging:

```text
content_imports
content_import_rows
```

## 15. Luồng tạo bài học

```text
Admin tạo course/module
→ Content editor tạo lesson draft
→ chọn course/module
→ nhập metadata và mục tiêu
→ chọn từ từ thư viện
→ nhập ngữ pháp
→ hệ thống chạy Eligibility Engine
→ lưu revision draft
```

Content editor không nhập lại cùng một từ cho từng dạng bài tập.

## 16. Eligibility Engine

Hệ thống tự xác định:

- Flashcard: có dữ liệu từ.
- Quiz: tối thiểu 4 nghĩa khác nhau.
- Nối từ: tối thiểu 4 cặp Hàn–Việt không trùng.
- Dịch Hàn → Việt: có accepted Vietnamese answers.
- Dịch Việt → Hàn: có accepted Korean answers.
- Chính tả: dùng CDN audio nếu có, nếu không dùng giọng thiết bị.

Điều kiện gửi duyệt hiện tại:

- tối thiểu 4 từ;
- tối thiểu 4 nghĩa phân biệt;
- không trùng Hangul;
- payload đúng cấu trúc;
- course/module hợp lệ.

Quality gate tồn tại ở cả application và PostgreSQL.

## 17. Luồng duyệt và phát hành

```text
draft
  │ content editor gửi duyệt
  ▼
in_review
  ├── admin yêu cầu sửa ──→ changes_requested ──→ draft
  └── admin phê duyệt ────→ approved
                                  │ admin phát hành
                                  ▼
                              published
                                  │ admin tạm gỡ
                                  ▼
                              unpublished
```

Khi ở `in_review`, content editor không thể sửa snapshot đang được duyệt.

## 18. Luồng phát hành đến learner

```text
Admin bấm phát hành
→ revision chuyển published
→ published_catalog được upsert
→ vocabulary snapshot đồng bộ về domain từ vựng
→ lesson_vocabulary được cập nhật
→ cache catalog được revalidate
→ learner chỉ đọc published_catalog
→ bài xuất hiện trong khóa học
```

Nếu course/module cha không tồn tại hoặc chưa public, PostgreSQL từ chối phát
hành.

## 19. Luồng tạo bài tập

```text
Lesson đã publish
→ tải vocabulary + grammar + authored exercises
→ Practice Generator sinh bundle
├── flashcards
├── quiz
├── typing
├── matching
├── translations
└── dictations
```

Logic bài tập nằm trong code; dữ liệu học nằm trong database. Content editor
không phải nhập lại cùng nội dung theo từng mode.

## 20. Luồng lưu tiến độ

```text
Người học thao tác
→ lưu local ngay lập tức
→ UI tiếp tục không chờ network
→ đồng bộ learning event/session lên Supabase
→ refresh: phục hồi local trước
→ đăng nhập/đổi thiết bị: lấy bản remote mới nhất
```

Dữ liệu gồm:

- lesson và mode;
- vị trí hiện tại;
- đáp án và câu sai;
- flashcard state;
- matching state;
- thời gian cập nhật;
- phiên bản lesson.

## 21. Luồng SRS

```text
Người học đánh giá thẻ
→ Quên / Khó / Tốt / Dễ
→ cập nhật trạng thái SRS
→ tính ngày ôn tiếp theo
→ dashboard hiển thị thẻ đến hạn
```

## 22. Audio khi chưa dùng Google Cloud TTS

Hiện tại không cần trả phí:

```text
Có audio_url → phát từ CDN
Không có audio_url → dùng speechSynthesis của thiết bị
```

Pipeline TTS/Storage đã có nền móng nhưng không phải điều kiện để học.

## 23. Checklist end-to-end đề xuất

### Kịch bản A — Content editor tạo bài

1. Đăng nhập tài khoản editor.
2. Mở `/bien-tap/noi-dung/moi`.
3. Tạo draft.
4. Chọn ít nhất 4 từ khác nhau.
5. Thêm một điểm ngữ pháp và ví dụ.
6. Kiểm tra Eligibility Report.
7. Gửi duyệt.
8. Xác nhận bài bị khóa chỉnh sửa.

### Kịch bản B — Admin yêu cầu sửa

1. Đăng nhập admin.
2. Mở `/quan-tri/duyet`.
3. Chọn bài.
4. Nhập nhận xét.
5. Chọn `Yêu cầu chỉnh sửa`.
6. Đăng nhập lại editor.
7. Xác nhận editor thấy phản hồi và sửa được bài.

### Kịch bản C — Admin phát hành

1. Editor gửi lại bài.
2. Admin phê duyệt.
3. Mở `/quan-tri/phat-hanh`.
4. Chọn `Phát hành ngay`.
5. Đăng xuất admin.
6. Đăng nhập learner.
7. Mở khóa học tương ứng.
8. Xác nhận bài mới xuất hiện.
9. Mở bài và thử tất cả mode.

### Kịch bản D — Tạm gỡ

1. Admin mở Release Center.
2. Nhập lý do.
3. Chọn `Tạm gỡ`.
4. Learner tải lại catalog.
5. Xác nhận bài không còn xuất hiện.
6. Xác nhận dữ liệu revision và tiến độ cũ vẫn còn trong DB.

## 24. Cấu hình môi trường tối thiểu

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

`NEXT_PUBLIC_SUPABASE_URL` không được chứa `/rest/v1`.

Sau khi sửa `.env.local`:

```bash
npm run dev
```

## 25. Giới hạn hiện tại

- Chưa có giao diện admin quản lý role; hiện dùng Supabase SQL Editor.
- Các role `content_reviewer`, `support_agent`, `billing_admin` tồn tại trong
  enum để mở rộng, nhưng giai đoạn này chỉ kiểm thử `learner`,
  `content_editor`, `admin`.
- Google Cloud TTS và thanh toán chưa kích hoạt.
- Chưa triển khai cron production, monitoring và staging environment.
