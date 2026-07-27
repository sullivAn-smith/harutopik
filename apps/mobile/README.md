# Harutopik Mobile

Ứng dụng mobile sẽ dùng Expo + React Native và gọi cùng API `/api/v1`.

Nguyên tắc:

- Supabase Auth lưu session bằng secure storage của thiết bị.
- Mọi API riêng tư gửi `Authorization: Bearer <access_token>`.
- Nội dung và tiến độ dùng contract trong `contracts/`.
- Hàng đợi learning events giữ UUID gốc khi retry.
- Không nhúng payOS checkout để mở nội dung số trong app store.
- Apple IAP/Google Play Billing xác minh receipt ở backend rồi cấp entitlement.

Chưa scaffold Expo trong step này để tránh duy trì một ứng dụng rỗng và bộ
dependency lớn trước khi thiết kế màn hình mobile được duyệt.
