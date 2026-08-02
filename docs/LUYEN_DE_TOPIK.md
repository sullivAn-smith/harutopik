# Luyện đề TOPIK I — phần Nghe

## Cài đặt database

```bash
npx supabase db push
```

Migration `202608020040_create_topik_listening_exams.sql` tạo bảng đề thi,
câu nghe, lượt thi và bucket `exam-audio`.

## Luồng content editor

1. Mở **Haru Studio → Ngân hàng đề**.
2. Tạo khung đề.
3. Thêm từng câu hoặc nhập file `.xlsx`.
4. Với từng câu, tải MP3/M4A/WAV hoặc nhập nội dung rồi bấm **Tạo audio Azure**.
5. Nghe thử, lưu bản nháp và gửi admin duyệt.

Hàng đầu tiên của Excel phải có đúng các cột:

```text
number | instruction | question | option_1 | option_2 | option_3 | option_4 | correct_option | explanation | audio_text
```

`correct_option` nhận giá trị từ 1 đến 4. Excel chỉ nhập phần chữ; audio được
tạo hoặc tải cho từng câu sau khi import.

## Luồng admin

1. Mở **Haru Control → Duyệt đề thi**.
2. Nghe từng audio và kiểm tra đáp án được tô xanh.
3. Chọn **Phê duyệt** hoặc **Yêu cầu chỉnh sửa**.
4. Đề đã duyệt có thể phát hành, hủy phê duyệt hoặc tạm gỡ sau phát hành.

## Luồng learner

1. Mở `/luyen-de` và chọn đề.
2. Đọc nguyên tắc, kiểm tra loa và bắt đầu.
3. Đồng hồ dùng thời hạn được tạo trên server; F5 không đặt lại thời gian.
4. Đáp án được lưu ngay khi chọn. Câu đã làm đổi sang màu xanh; câu đánh dấu
   có chấm vàng.
5. Hết giờ hệ thống tự nộp. Đáp án đúng chỉ xuất hiện ở trang kết quả.
