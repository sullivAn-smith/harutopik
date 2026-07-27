# Thiết lập đăng nhập Google

Harutopik dùng Supabase Auth với OAuth PKCE. Website chỉ giữ session Supabase
trong cookie; không lưu Google access token.

## 1. Google Auth Platform

1. Tạo hoặc chọn một Google Cloud project.
2. Cấu hình Branding, Audience và Data Access.
3. Giữ các scope tối thiểu: `openid`, email và profile.
4. Tạo OAuth Client ID loại **Web application**.
5. Thêm Authorized JavaScript origins:
   - `http://localhost:3000`
   - domain production của Harutopik khi có.
6. Thêm Authorized redirect URI:
   - lấy chính xác **Callback URL** tại Supabase Dashboard → Authentication →
     Providers → Google;
   - URL có dạng `https://<project-ref>.supabase.co/auth/v1/callback`.
7. Lưu Client ID và Client Secret. Không đưa Client Secret vào source hoặc
   `.env.local` của frontend.

## 2. Supabase Dashboard

1. Vào Authentication → Providers → Google.
2. Bật Google provider.
3. Nhập Client ID và Client Secret lấy từ Google.
4. Vào Authentication → URL Configuration:
   - Site URL khi phát triển: `http://localhost:3000`;
   - Redirect URLs: `http://localhost:3000/auth/callback`;
   - thêm `https://<domain-production>/auth/callback` trước khi deploy.

## 3. Kiểm thử

1. Chạy `npm run dev`.
2. Mở `http://localhost:3000/dang-nhap`.
3. Chọn **Tiếp tục với Google**.
4. Sau khi cho phép, Google phải đưa người dùng về `/tai-khoan`.
5. Kiểm tra `auth.users`, `public.learner_profiles` và
   `public.user_roles`: tài khoản mới phải có role `learner`.

Nếu Google app đang ở chế độ Testing, thêm email cần thử vào danh sách Test
users. Không cần thêm Google Client Secret vào Vercel/hosting vì Supabase giữ
secret này ở phía Auth server.

## 4. Khi làm ứng dụng mobile

Tạo OAuth Client ID riêng cho Android và iOS, giữ Web Client ID đứng đầu trong
danh sách Client IDs của Google provider trên Supabase. App dùng deep link riêng
cho callback nhưng tiếp tục dùng cùng Supabase project, `auth.users`, role và
toàn bộ backend hiện tại.
