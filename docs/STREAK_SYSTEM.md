# Hệ thống streak Harutopik

## Luồng chính

1. Người học hoàn thành một lượt luyện tập, ôn flashcard hoặc nộp đề thi.
2. API backend ghi hoạt động bằng hàm `record_streak_activity`; client không được tự tăng streak.
3. PostgreSQL đổi thời điểm hoàn thành sang ngày tại `Asia/Ho_Chi_Minh`.
4. Mỗi tài khoản chỉ có một bản ghi hoạt động trong một ngày. Các lần học tiếp theo không cộng thêm streak.
5. Nếu ngày gần nhất là hôm qua, streak tăng một. Nếu bỏ lỡ ngày và còn khiên, hệ thống tự dùng một khiên; nếu hết khiên, streak bắt đầu lại từ một.
6. Khi chạm mốc do admin cấu hình, hệ thống tự tặng khiên và ghi lịch sử vào `streak_ledger`.

Timestamp hoàn thành do client gửi được chấp nhận để hỗ trợ đồng bộ muộn, nhưng server từ chối thời điểm trong tương lai quá 5 phút hoặc cũ hơn 14 ngày. Ngày streak và múi giờ vẫn do database quyết định.

## Khu vực admin

Mở `/quan-tri/streak` để:

- đặt số ngày của một mốc thưởng, số khiên được tặng và số khiên tự nhận tối đa;
- bật/tắt nhắc học, chọn giờ nhắc theo giờ Việt Nam;
- tìm theo tên/email, chọn tài khoản hoặc tặng khiên cho toàn hệ thống.

Trang chủ dùng hai banner tích hợp sẵn, không cần admin tải ảnh:

- ban ngày: từ `05:00` đến trước `18:00` theo giờ Việt Nam;
- ban đêm: từ `18:00` đến trước `05:00` theo giờ Việt Nam.

Màu nền được dựng trực tiếp bằng CSS nên nhẹ, sắc nét trên mọi kích thước và không cần tải ảnh từ Storage. Số streak, khiên và trạng thái bảy ngày luôn lấy từ dữ liệu thật.

## Nhắc học

Migration tạo hàm `enqueue_daily_streak_reminders()` và, nếu dự án đã bật `pg_cron`, lên lịch chạy mỗi giờ. Hàm chỉ thực thi ở giờ Việt Nam mà admin đã chọn và không tạo trùng thông báo trong cùng ngày.

Hiện tại đây là **thông báo trong ứng dụng**. Push notification ra trình duyệt hoặc điện thoại cần bổ sung đăng ký thiết bị (Web Push/FCM/Expo), lưu device token và dịch vụ gửi push. Không nên coi notification trong database là push notification.

Nếu dự án Supabase chưa bật Cron, bật integration Cron/`pg_cron` trong dashboard rồi chạy lại riêng lịch gọi:

```sql
select cron.schedule(
  'harutopik-streak-reminder',
  '0 * * * *',
  'select public.enqueue_daily_streak_reminders();'
);
```

## Cài đặt và kiểm thử

Áp dụng migration:

```bash
npx supabase db push
```

Khởi động lại website:

```bash
npm run dev
```

Kiểm thử nhanh:

1. Đăng nhập learner và hoàn thành một mode luyện tập hoặc nộp một đề.
2. Về trang chủ: streak phải là một và ngày hiện tại có dấu hoàn thành.
3. Hoàn thành thêm nhiều hoạt động trong cùng ngày: streak vẫn giữ nguyên.
4. Đăng nhập admin, mở `/quan-tri/streak`, thay rule và tặng thử một khiên cho tài khoản learner.
5. Kiểm tra trang chủ trước và sau `18:00` giờ Việt Nam để xác nhận giao diện sáng/tối đổi tự động.

Các bảng cần xem khi chẩn đoán:

- `user_streaks`: trạng thái hiện tại;
- `streak_activity_days`: ngày đã học, chống cộng trùng;
- `streak_ledger`: lịch sử nhận/dùng khiên, reset và admin tặng;
- `streak_settings`: rule toàn hệ thống.

Trên banner của learner, số khiên luôn hiển thị cạnh kỷ lục streak. Nút `?` mở hướng dẫn ngắn về cách tính ngày, lúc khiên được tự dùng và mốc nhận khiên hiện do admin cấu hình.
