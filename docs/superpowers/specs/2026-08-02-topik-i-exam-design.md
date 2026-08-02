# Thi thử TOPIK I — Design Spec

## Mục tiêu

Nâng cấp phần luyện đề hiện tại thành một lượt thi TOPIK I hoàn chỉnh gồm hai
phần theo thứ tự bắt buộc: Nghe rồi đến Đọc. Nội dung được biên soạn, duyệt,
phát hành và hotfix theo ba role hiện có; trải nghiệm learner mô phỏng thi thật
nhưng vẫn phù hợp với việc luyện tập trực tuyến.

## Phạm vi

- Chỉ triển khai TOPIK I trong giai đoạn này.
- Một đề gồm đúng hai phần: `listening` và `reading`.
- Không triển khai phần Viết hoặc TOPIK II.
- Một lượt thi dùng chung một `exam_attempt`, nhưng mỗi phần có thời hạn và
  trạng thái riêng.
- Thứ tự cố định: chuẩn bị → Nghe → chuyển phần → Đọc → kết quả.

## Các phương án đã cân nhắc

### Phương án được chọn: audio riêng từng câu, learner chủ động bắt đầu

Editor quản lý một audio riêng cho mỗi câu. Learner bấm **Nghe** để bắt đầu;
audio chạy từ đầu đến cuối, không pause, không tua và không đổi câu khi đang
phát. Mặc định mỗi câu chỉ được nghe một lần. Đây là phương án cân bằng giữa
khả năng quản trị/hotfix từng câu và trải nghiệm thi có kiểm soát.

### Không chọn: một băng nghe liên tục

Một timeline chung sát PBT hơn nhưng khó biên tập, khó hotfix và dễ làm hỏng
toàn bộ đề khi chỉ một câu cần thay đổi.

### Không chọn: trình phát audio tự do

Cho pause, tua hoặc nghe không giới hạn phù hợp học bài hơn thi thử và làm sai
mục tiêu mô phỏng kỳ thi.

## Mô hình nội dung

### Đề thi

`exam_sets` giữ metadata chung: mã, tên, mô tả, cấp độ, hướng dẫn, trạng thái,
version và người tạo. Đề có cấu hình thời gian riêng cho phần Nghe và phần Đọc.

### Câu hỏi

`exam_questions.section` hỗ trợ `listening` và `reading`. Mỗi câu có:

- số thứ tự trong phần;
- hướng dẫn và nội dung hiển thị;
- bốn lựa chọn và một đáp án đúng;
- giải thích chỉ hiện sau khi nộp;
- ảnh minh họa tùy chọn;
- audio URL và audio text cho câu Nghe;
- `play_limit`, mặc định và giới hạn ở `1` trong chế độ TOPIK I nghiêm túc.

Câu Nghe bắt buộc có audio. Câu Đọc không có audio nhưng có thể có ảnh.

## Luồng content editor

1. Tạo khung đề TOPIK I với metadata và thời gian hai phần.
2. Chuyển giữa tab Nghe và Đọc trong cùng trình biên tập.
3. Phần Nghe:
   - thêm câu thủ công hoặc import bảng;
   - upload MP3/M4A/WAV tối đa 15 MB; hoặc
   - nhập nội dung để Azure Speech tạo audio cache trên Supabase Storage;
   - nghe thử audio trước khi lưu.
4. Phần Đọc:
   - thêm câu thủ công;
   - import `.xlsx` hoặc `.csv`;
   - upload ảnh cho câu cần hình như đề thật.
5. Lưu draft, xem Eligibility Report theo từng phần và gửi duyệt.
6. Chỉ sửa đề của mình khi `draft` hoặc `changes_requested`.

Import dùng cùng bộ cột cơ sở cho cả hai phần. Cột `section` xác định Nghe/Đọc;
`audio_text` và `audio_url` chỉ dùng cho Nghe, `image_url` dùng khi có ảnh.
Preview phải chỉ rõ dòng lỗi, thiếu đáp án, trùng số câu và media không hợp lệ.

## Luồng admin

1. Hàng chờ hiển thị đề `pending_review` tương tự luồng duyệt bài học.
2. Admin kiểm tra metadata, thời lượng, từng câu, đáp án, ảnh và nghe thử audio.
3. Admin phê duyệt hoặc yêu cầu chỉnh sửa kèm nhận xét.
4. Đề `approved` được phát hành; learner chỉ thấy đề `published`.
5. Admin có thể tạm gỡ đề.
6. Hotfix đề đang phát hành tạo một version mới từ bản hiện tại, cho phép sửa
   câu, đáp án và media rồi áp dụng trực tiếp cho lượt thi bắt đầu sau hotfix.

Hotfix không thay đổi `question_snapshot` của lượt thi đã bắt đầu. Audit log ghi
người sửa, lý do, version cũ/mới và thời điểm áp dụng.

## Luồng learner trước khi thi

Trang chuẩn bị sử dụng phong cách trang trọng giống ảnh tham chiếu, kết hợp
nhận diện Haru bằng icon chim cánh cụt. Trang hiển thị:

- thứ tự Nghe → Đọc và thời gian từng phần;
- audio chỉ nghe một lần, không pause/tua;
- không quay lại phần đã hoàn thành;
- đáp án được tự động lưu;
- hệ thống ghi nhận việc rời cửa sổ thi;
- bước kiểm tra loa trước khi bắt đầu;
- khuyến nghị bật toàn màn hình.

Learner phải đăng nhập và xác nhận quy định trước khi tạo lượt thi.

## Trải nghiệm phần Nghe

- Stepper luôn hiển thị `Chuẩn bị → Nghe → Đọc → Kết quả`.
- Mỗi câu hiện nút **Nghe** trước khi phát.
- Sau khi bấm, audio chạy đến hết; không có pause, thanh tua hoặc điều khiển tốc
  độ. Trong lúc phát không được đổi câu.
- Khi audio kết thúc, learner chọn hoặc đổi đáp án của câu hiện tại rồi chuyển
  câu tiếp theo.
- Câu đã rời khỏi bị khóa và không quay lại.
- Số lần phát được ghi ở server để refresh không khôi phục quyền nghe.
- Hết thời gian phần Nghe: tự lưu, khóa phần và chuyển sang Đọc.

Nếu audio không tải được, hệ thống chưa tiêu hao lượt nghe, hiển thị lỗi và cho
phép thử tải lại. Nếu audio đã bắt đầu phát rồi mất mạng, sự kiện phát vẫn được
coi là đã sử dụng để giữ tính nghiêm túc.

## Trải nghiệm phần Đọc

- Đồng hồ riêng bắt đầu khi learner vào phần Đọc.
- Learner tự do chuyển giữa các câu Đọc.
- Có đánh dấu xem lại, bộ đếm câu chưa trả lời và danh sách câu.
- Câu có ảnh hiển thị ảnh tối ưu nhưng cho phép xem rõ nội dung.
- Hết giờ tự động nộp toàn bộ lượt thi.

## Giám sát cửa sổ thi

Client ghi nhận `visibilitychange`, mất focus và thoát toàn màn hình trong phần
Nghe/Đọc. Mỗi sự kiện hợp lệ:

- tăng bộ đếm đã lưu trên server;
- hiển thị banner đỏ với số lần hiện tại;
- ghi loại sự kiện, section và timestamp;
- không tự hủy hoặc trừ điểm.

Sự kiện trùng phát sinh sát nhau được gộp để một lần chuyển tab không bị đếm
nhiều lần. Kết quả cuối hiển thị tổng số lần rời cửa sổ; dữ liệu chi tiết chỉ
editor/admin được xem khi cần đối soát.

Đây là tín hiệu giám sát, không phải chống gian lận tuyệt đối; giao diện không
tuyên bố có khả năng phát hiện mọi hành vi.

## Lưu phiên và snapshot

Khi bắt đầu, server snapshot metadata cần thiết, câu hỏi, đáp án đúng và URL
media. Attempt lưu:

- section hiện tại và trạng thái từng section;
- `listening_expires_at` và `reading_expires_at`;
- đáp án, câu hiện tại và câu đánh dấu;
- lượt phát audio theo câu;
- sự kiện rời cửa sổ;
- version đề được sử dụng.

Server là nguồn thời gian chính thức. Refresh phục hồi đúng section, đáp án,
vị trí và quyền nghe còn lại. Client có hàng đợi tạm cho đáp án khi mất mạng và
đồng bộ lại khi kết nối phục hồi.

## Chấm điểm và kết quả

Kết quả chỉ xuất hiện sau khi hoàn thành hoặc hết giờ phần Đọc. Trang kết quả
hiển thị:

- điểm Nghe;
- điểm Đọc;
- tổng điểm;
- số câu đúng/đã trả lời theo từng phần;
- chi tiết đúng, sai, bỏ trống và giải thích;
- số lần rời cửa sổ thi.

Chấm điểm dùng snapshot, không dùng đề hiện hành sau hotfix.

## Giao diện

- Phong cách nghiêm túc, rõ ràng và ít gây xao nhãng trong lúc thi.
- Haru Penguin nổi bật ở trang chuẩn bị, chuyển phần và kết quả; trong màn thi
  chỉ dùng biểu tượng nhỏ.
- Không dùng emoji thay icon chức năng; icon phải có nhãn/tooltip phù hợp.
- Desktop là trải nghiệm chính nhưng responsive trên mobile; cảnh báo rõ rằng
  desktop/laptop được khuyến nghị.
- Màu trạng thái nhất quán: xanh dương đang làm, xanh lá đã trả lời, vàng đánh
  dấu, đỏ cảnh báo/khóa.

## Bảo mật và quyền

- Learner chỉ đọc đề published và attempt của chính mình.
- Editor chỉ quản lý đề của mình ở trạng thái cho phép.
- Admin duyệt, phát hành, tạm gỡ và hotfix.
- Server Actions/API kiểm tra quyền; PostgreSQL RPC và RLS bảo vệ lại ở tầng dữ
  liệu.
- Storage áp dụng bucket riêng cho audio và ảnh đề thi, chỉ staff được ghi.

## Kiểm thử chấp nhận

- Editor tạo được đề đủ Nghe + Đọc bằng nhập tay và import.
- Editor upload hoặc tạo audio và upload ảnh thành công.
- Đề thiếu audio/đáp án/phần thi không thể gửi duyệt.
- Admin duyệt, yêu cầu sửa, phát hành, tạm gỡ và hotfix được ghi audit.
- Learner không thể mở đề chưa phát hành hoặc attempt của người khác.
- Audio không pause/tua, không phát quá giới hạn và refresh không reset lượt.
- Nghe khóa câu đã qua; Đọc cho di chuyển và đánh dấu tự do.
- Hết giờ từng phần chuyển/nộp đúng theo thời gian server.
- Chuyển tab làm tăng bộ đếm một lần hợp lệ và xuất hiện ở kết quả.
- Attempt đang chạy không đổi sau hotfix; attempt mới dùng version mới.
- Typecheck, unit/component tests, production build và E2E đều đạt.

