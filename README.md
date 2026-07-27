# Harutopik

Harutopik là nền tảng học tiếng Hàn dành cho người Việt, được xây dựng theo
hướng dùng chung nội dung và nghiệp vụ giữa website và ứng dụng di động.

## Bắt đầu

Yêu cầu:

- Node.js 20+
- npm

Cài đặt và chạy môi trường phát triển:

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm run build
```

## Cấu trúc hiện tại

- `app/`: route và layout của Next.js
- `components/ui/`: các primitive giao diện dùng chung
- `features/auth/`: luồng đăng ký, đăng nhập và phiên người dùng
- `lib/`: cấu hình và logic dùng chung
- `public/`: hình ảnh và audio tĩnh
- `supabase/migrations/`: schema PostgreSQL và chính sách RLS
- `lib/learning-core/`: chấm đáp án, trạng thái buổi học và thuật toán SRS

Tiến độ học được gửi qua API `/api/v1/learning/events`. Sự kiện có UUID để
chống ghi trùng; khi mất mạng, client chỉ giữ hàng đợi tạm thời và gửi lại khi
kết nối phục hồi. PostgreSQL vẫn là nguồn dữ liệu chính thức.

Quyền quản trị không nằm trong metadata do người dùng chỉnh sửa. Role được lưu
ở `user_roles`, kiểm tra lại ở server và tiếp tục được bảo vệ bằng PostgreSQL
RLS. Workflow nội dung tách người soạn, người duyệt và người xuất bản.

## Kết nối tài khoản

Tạo một Supabase project, chạy migration trong `supabase/migrations`, sau đó
điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vào
`.env.local`. Khi chưa có các giá trị này, website vẫn build và cho phép học
nội dung công khai nhưng không tạo phiên đăng nhập giả.

## Công cụ cần chuẩn bị khi kết nối backend

- Tài khoản và một project Supabase.
- Supabase CLI (khuyến nghị để chạy migration và tạo type).
- Docker Desktop chỉ cần khi muốn chạy Supabase hoàn toàn trên máy.

Không cần cài CLI hoặc Docker để tiếp tục phát triển giao diện và nghiệp vụ
trong source code.

## Thanh toán

Website dùng payOS Hosted Checkout cho giao dịch VND một lần. Không lưu dữ liệu
thẻ hoặc tin vào return URL; quyền Pro chỉ được cấp bởi webhook đã xác minh.
Entitlement là lớp độc lập để Apple IAP và Google Play Billing có thể cấp cùng
một quyền `premium_content` khi ứng dụng di động được phát hành.

## SEO và quan sát hệ thống

Ứng dụng sinh `sitemap.xml`, `robots.txt`, web manifest và Open Graph metadata.
Core Web Vitals, lỗi client và chuyển trang chỉ được gửi khi
`NEXT_PUBLIC_ANALYTICS_ENDPOINT` được cấu hình; payload không chứa email, user
ID hoặc nội dung câu trả lời. Global Privacy Control được tôn trọng.

## API dùng chung

API version 1 nằm dưới `/api/v1` và trả cùng một response envelope có
`apiVersion` cùng `requestId`. Web xác thực bằng cookie; mobile dùng Supabase
access token trong `Authorization: Bearer`. Catalog công khai, còn hồ sơ,
entitlement và learning events luôn xác minh user ở server.

- `GET /api/v1/catalog`
- `GET /api/v1/me`
- `PATCH /api/v1/me` — cập nhật hồ sơ và hoàn tất onboarding (dùng chung cho web/app)
- `GET/POST /api/v1/vocabulary-lists` — đọc và tạo bộ từ cá nhân
- `POST /api/v1/vocabulary-lists/:listId/items` — lưu từ vào bộ
- `DELETE /api/v1/vocabulary-lists/:listId/items/:vocabularyId` — bỏ từ khỏi bộ
- `GET /api/v1/entitlements`
- `POST /api/v1/learning/events`
- `GET /api/v1/openapi`

## Xác minh trước phát hành

`npm run verify` chạy lint, typecheck, unit/component tests, production build,
performance budget và E2E trên desktop/mobile Chromium. Checklist vận hành nằm
trong `docs/RELEASE_CHECKLIST.md`.
