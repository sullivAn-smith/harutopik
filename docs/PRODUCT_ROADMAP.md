# Harutopik Product Roadmap

## Nguyên tắc hiện tại

- Hoàn thiện vòng lặp học cốt lõi trước khi xây thanh toán.
- Mọi tiến độ phải phục hồi được sau refresh, mất mạng và đổi thiết bị.
- Backend và dữ liệu phải dùng lại được cho ứng dụng mobile.
- Không mở rộng nhiều khóa học trước khi một khóa học mẫu hoạt động trọn vẹn.
- Thanh toán payOS được giữ nguyên ở trạng thái nền móng, chưa ưu tiên triển khai.

## Quyết định kiến trúc media

- Tạo audio một lần bằng TTS trong quy trình biên soạn.
- Lưu kết quả vào Supabase Object Storage.
- Website và app tải audio trực tiếp từ CDN, không proxy qua application server.
- Giữ browser `speechSynthesis` làm fallback trong thời gian chuyển đổi.
- Dùng URL có version/checksum để cache dài hạn và cập nhật không xung đột.
- Chưa gọi TTS theo từng lượt phát của người học.

## P0 — Vòng lặp học không mất dữ liệu

1. Lưu và phục hồi phiên học:
   - mode đang học;
   - vị trí hiện tại;
   - flashcard đã thuộc/chưa thuộc;
   - câu sai;
   - nhóm nối từ;
   - câu nghe, câu dịch đang làm;
   - thời điểm cập nhật và version bài học.
2. Lưu local ngay lập tức để chống mất dữ liệu khi refresh/offline.
3. Đồng bộ phiên lên Supabase cho người đã đăng nhập.
4. Có lựa chọn tiếp tục phiên cũ hoặc học lại từ đầu.
5. Chỉ xóa phiên tạm sau khi hoàn thành và đã đồng bộ.

## P0 — Hồ sơ và onboarding

1. Cho phép sửa:
   - tên hiển thị;
   - ảnh đại diện;
   - trình độ tiếng Hàn;
   - mục tiêu học;
   - mục tiêu phút mỗi ngày;
   - múi giờ.
2. Onboarding sau lần đăng nhập đầu tiên.
3. Dashboard dùng dữ liệu thật: bài gần nhất, thời gian học, streak, tiến độ và
   số thẻ đến hạn.

## P1 — Nâng cấp trải nghiệm bài tập

### Nối từ

- Cho phép chọn sai và phản hồi rõ ràng, không khóa luồng học.
- Hiển thị cặp đúng ngay dưới lựa chọn sai trong thời gian ngắn.
- Ghi lại từ sai.
- Cuối lượt có màn hình kết quả và nút ôn lại riêng các cặp sai.

### Dịch hai chiều

- Trình tự mặc định: Hàn → Việt trước, sau khi kiểm tra mới mở Việt → Hàn.
- Nếu bấm đổi hướng quá sớm, hiển thị message nhỏ giải thích điều kiện.
- Không xóa câu trả lời khi thao tác không hợp lệ.
- Ghi lại lỗi riêng theo từng chiều dịch.

### Flashcard và danh sách cá nhân

- Có nút yêu thích ở danh sách từ và flashcard.
- Mỗi người dùng có thể tạo nhiều danh sách tùy chỉnh.
- Danh sách mặc định: Yêu thích, Cần ôn, Đã thuộc.
- Cho phép thêm/xóa từ, đổi tên danh sách và tạo phiên flashcard từ một danh
  sách.
- Một từ có thể thuộc nhiều danh sách.

## P1 — SRS và tiến độ thật

1. Trang “Ôn tập hôm nay”.
2. Rating Quên / Khó / Tốt / Dễ.
3. Lịch ôn và số từ đến hạn.
4. “Tiếp tục học” mở đúng bài, mode và vị trí gần nhất.
5. Streak và thời gian học lấy từ `learning_events`.

## P2 — Hệ thống nội dung

1. Chuyển catalog xuất bản từ source code sang database.
2. CMS tạo/sửa khóa học, module, bài học, từ vựng, ngữ pháp và bài tập.
3. Upload hình/audio.
4. Workflow nháp → duyệt → xuất bản → lưu trữ.
5. Import CSV/XLSX và preview trước khi xuất bản.

## P3 — Luyện đề và đánh giá năng lực

- Ngân hàng đề, timer, autosave đáp án, chấm điểm, giải thích, lịch sử và phân
  tích kỹ năng yếu.

## P4 — Giữ chân và tăng trưởng

- Nhắc ôn, báo cáo tuần, achievement, bookmark/ghi chú, tìm kiếm và analytics.

## Tạm hoãn — Thanh toán

Schema order/entitlement và khung payOS được giữ lại nhưng không phát triển
thêm cho đến khi P0, P1 và nội dung học cốt lõi hoạt động ổn định.

## Thứ tự triển khai gần nhất

1. Sửa mất phiên flashcard khi F5.
2. Edit profile và onboarding.
3. Phản hồi nối từ sai + review kết quả.
4. Khóa/mở dịch hai chiều theo trình tự.
5. Wishlist và danh sách từ tùy chỉnh.
6. Dashboard, SRS và tiến độ thật.
7. CMS nội dung.
