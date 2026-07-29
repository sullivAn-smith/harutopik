# Audio TTS pipeline

## Mục tiêu

- Azure Speech chỉ được gọi ở backend bởi content editor hoặc admin.
- Learner chỉ phát MP3 đã lưu từ Supabase CDN.
- Cùng text, provider, voice, tốc độ và định dạng chỉ tạo đúng một file.
- MP3 dùng chung giữa website và ứng dụng.

## Biến môi trường

```env
TTS_PROVIDER=azure
AZURE_SPEECH_KEY=
AZURE_SPEECH_ENDPOINT=
AZURE_SPEECH_VOICE=ko-KR-SunHiNeural
AZURE_SPEECH_RATE=-12%
AZURE_SPEECH_OUTPUT_FORMAT=audio-24khz-48kbitrate-mono-mp3
AUDIO_WORKER_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

Các khóa Azure, worker và service role chỉ được cấu hình ở server. Không thêm
tiền tố `NEXT_PUBLIC_`.

`SPEECH_KEY` và `SPEECH_ENDPOINT` cũng được hỗ trợ để tương thích với tên biến
Azure mặc định, nhưng tên có tiền tố `AZURE_` được ưu tiên.

## Luồng tạo một audio

1. Content editor mở một từ bản nháp và bấm **Tạo audio Azure**.
2. Frontend gọi `POST /api/v1/vocabulary/{vocabularyId}/audio`.
3. Backend kiểm tra đăng nhập, role, quyền sở hữu và trạng thái từ.
4. Backend đọc Hangul từ database, chuẩn hóa Unicode NFC.
5. SHA-256 được tạo từ provider, voice, rate, output format và text.
6. Nếu job hoàn tất đã tồn tại, URL CDN được tái sử dụng.
7. Nếu file đã có trong Storage, Azure không được gọi.
8. Nếu chưa có, backend gọi Azure tối đa ba lần với exponential backoff.
9. MP3 được upload vào:

```text
vocabulary-audio/azure/ko-KR-SunHiNeural/{sourceHash}.mp3
```

10. `vocabulary_items.audio_url` được cập nhật bằng public CDN URL.

## Batch worker

Trang `/bien-tap/audio` có thể xếp hàng audio còn thiếu. Scheduler gọi:

```text
POST /api/internal/audio-jobs
Authorization: Bearer <AUDIO_WORKER_SECRET>
```

Mỗi lần xử lý tối đa năm job. Hàm `claim_audio_generation_job()` sử dụng
`FOR UPDATE SKIP LOCKED` để nhiều worker không nhận cùng một job.

## Cache và retry

- Cache key là duy nhất trên toàn hệ thống, không chỉ trong một vocabulary item.
- Upload dùng `upsert: false`; file bất biến được cache một năm.
- Retry chỉ áp dụng cho network timeout, HTTP 429 và lỗi 5xx tạm thời.
- HTTP 400/401/403 không retry.
- Lỗi được lưu trong `audio_generation_jobs.error_message` để CMS hiển thị.
