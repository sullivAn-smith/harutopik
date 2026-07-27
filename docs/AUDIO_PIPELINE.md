# Audio TTS pipeline

## Mục tiêu

- Content editor chỉ xếp hàng audio trong CMS.
- Worker gọi Google Cloud Text-to-Speech ở phía server.
- MP3 được lưu một lần trong bucket public `vocabulary-audio`.
- Website và ứng dụng dùng trực tiếp URL CDN trong `vocabulary_items.audio_url`.
- Cùng nội dung và giọng đọc dùng chung checksum, không phát sinh lại chi phí.

## Biến môi trường

```env
GOOGLE_CLOUD_TTS_API_KEY=
GOOGLE_CLOUD_TTS_VOICE=ko-KR-Neural2-A
AUDIO_WORKER_SECRET=
```

`GOOGLE_CLOUD_TTS_API_KEY`, `AUDIO_WORKER_SECRET` và
`SUPABASE_SERVICE_ROLE_KEY` chỉ được cấu hình ở môi trường server. Không thêm
tiền tố `NEXT_PUBLIC_`.

## Cách vận hành

1. Content editor mở `/bien-tap/audio`.
2. Chọn “Xếp hàng audio còn thiếu”.
3. Scheduler gọi `POST /api/internal/audio-jobs` với header:

```text
Authorization: Bearer <AUDIO_WORKER_SECRET>
```

Mỗi lần gọi xử lý tối đa 5 job để kiểm soát thời gian chạy và quota. Scheduler
có thể gọi mỗi phút. Hàm `claim_audio_generation_job()` khóa nguyên tử bằng
`FOR UPDATE SKIP LOCKED`, vì vậy nhiều worker không nhận cùng một job.

## Retry và tính nhất quán

- Mỗi job được thử tối đa 3 lần.
- Job lỗi lưu thông báo để xem trong CMS.
- Xếp hàng lại sẽ đặt lại số lần thử.
- Trước khi upload, worker kiểm tra checksum với Hangul hiện tại. Nếu content
  editor đã sửa từ, job cũ bị từ chối để không gắn nhầm audio.
- Tên file chứa checksum và cache một năm; thay đổi nội dung tạo đường dẫn mới,
  tránh CDN trả file cũ.
