# Luyện đề TOPIK I — Nghe và Đọc

## Cài đặt database

```bash
npx supabase db push
```

Migration `202608020040_create_topik_listening_exams.sql` tạo nền móng đề thi.
Migration `202608020041_upgrade_topik_i_exam_flow.sql` bổ sung phần Đọc, thời
gian riêng cho từng phần, lượt phát audio, giám sát cửa sổ, điểm theo phần,
hotfix và bucket `exam-images`.

## Luồng content editor

1. Mở **Haru Studio → Ngân hàng đề**.
2. Tạo khung đề.
3. Biên soạn hai tab **Nghe** và **Đọc**, thêm tay hoặc nhập `.xlsx`/`.csv`.
4. Với câu Nghe, tải MP3/M4A/WAV hoặc nhập nội dung rồi bấm **Tạo audio Azure**.
5. Với câu có hình, tải JPG/PNG/WebP lên Supabase Storage.
6. Nghe thử, kiểm tra eligibility, lưu bản nháp và gửi admin duyệt.

Hàng đầu tiên của Excel phải có đúng các cột:

```text
section | number | instruction | question | option_1 | option_2 | option_3 | option_4 | correct_option | explanation | audio_text | image_url
```

`section` nhận `listening` hoặc `reading`; `correct_option` nhận 1–4. Audio được
tạo hoặc tải riêng cho từng câu Nghe sau khi import. File mẫu nằm tại
`public/templates/topik-i-exam-import-template.csv`.

## Luồng admin

1. Mở **Haru Control → Duyệt đề thi**.
2. Nghe từng audio và kiểm tra đáp án được tô xanh.
3. Chọn **Phê duyệt** hoặc **Yêu cầu chỉnh sửa**.
4. Đề đã duyệt có thể phát hành, hủy phê duyệt hoặc tạm gỡ sau phát hành.
5. Admin có thể hotfix đề published; attempt đã bắt đầu giữ snapshot cũ, lượt
   thi tạo sau hotfix dùng version mới.

## Luồng learner

1. Mở `/luyen-de` và chọn đề.
2. Đọc nguyên tắc, kiểm tra loa và bắt đầu.
3. Kiểm tra loa, đọc quy định và bắt đầu phần Nghe.
4. Mỗi câu Nghe chỉ phát khi learner bấm **Bắt đầu nghe**; audio không có
   pause/tua và chỉ được dùng một lần. Câu đã qua bị khóa.
5. Hoàn thành Nghe mới chuyển sang Đọc. Phần Đọc cho chuyển câu và đánh dấu tự do.
6. Đồng hồ từng phần dùng thời hạn server; F5 không đặt lại thời gian hoặc lượt nghe.
7. Chuyển tab/mất focus được ghi nhận và cảnh báo đỏ.
8. Kết quả hiển thị điểm Nghe, Đọc, tổng điểm và số lần rời cửa sổ.
