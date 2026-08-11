# Thiết kế Home cố định và thư viện ba bộ giáo trình

## Mục tiêu

Thu gọn Home desktop thành một màn hình không cuộn, đồng thời thay các dãy bìa sách dài bằng ba bìa đại diện cho ba bộ giáo trình. Người học chọn một bộ để mở trang riêng, sau đó chọn từng quyển và xem danh sách bài ngay bên dưới.

## Phạm vi

- Làm chữ “Thư viện học” trong sidebar đậm như “Quản lý bộ từ”.
- Sidebar không xổ danh sách giáo trình; mục “Thư viện học” dẫn tới trang thư viện.
- Home desktop hiển thị trọn nội dung chính trong một viewport và không cuộn dọc.
- Home mobile vẫn được cuộn để tránh ép hoặc cắt nội dung trên màn hình nhỏ.
- Khu thư viện trên Home chỉ có ba bìa đại diện bằng nhau.
- Tạo trang thư viện dùng chung cho ba bộ giáo trình.
- Giữ nguyên dữ liệu bài học, tiến độ học, đăng nhập và các route bài học hiện tại.

## Ba bộ giáo trình

| Mã bộ | Nhận diện trên Home | Số quyển | Trạng thái dữ liệu hiện tại |
| --- | --- | ---: | --- |
| `1` | Bìa xanh nước biển, số `1` | 6 | Dùng dữ liệu TOPIK hiện có |
| `2` | Bìa cyan, số `2` | 6 | Chưa phát hành |
| `3` | Bìa xanh lá, số `3` | 8 | Chưa phát hành |

Trên ba bìa đại diện ở Home không ghi tên giáo trình và không ghi chữ “TOPIK”. Bìa chỉ hiển thị số `1`, `2`, `3`; họa tiết/logo nền hiện có được giữ làm nhận diện thị giác.

## Kiến trúc route

- `/`: Home hiển thị ba bìa đại diện.
- `/thu-vien`: trang chọn ba bộ giáo trình; mặc định hiển thị cả ba bộ.
- `/thu-vien/[series]`: trang danh sách quyển của một bộ, trong đó `series` chỉ nhận `1`, `2`, `3`.
- Route bài học đã phát hành tiếp tục dùng `/courses/[courseSlug]/lessons/[lessonSlug]`.
- Route quyển TOPIK hiện tại `/courses/[courseSlug]` vẫn hoạt động để không phá liên kết cũ, nhưng luồng mới từ Home đi qua `/thu-vien/1`.

Route động phải xử lý giá trị bộ không hợp lệ bằng trang 404. Trang thư viện cần có trạng thái tải tức thời phù hợp với hướng dẫn Next.js local để việc chuyển trang không tạo cảm giác đứng ứng dụng.

## Home desktop

### Sidebar

- “Thư viện học” dùng cùng `font-weight` với “Quản lý bộ từ”.
- Bỏ hành vi mở/đóng danh sách sách trong sidebar.
- Nhấn “Thư viện học” chuyển tới `/thu-vien`.
- “Nâng cấp” và khối tài khoản vẫn neo ở đáy sidebar.

### Nội dung chính

- Ở breakpoint desktop (`lg` trở lên), khung Home cao tối đa bằng viewport và ẩn cuộn dọc của chính trang.
- Hero, streak, khóa học đang mở, kiến thức nền tảng và luyện đề được giữ nguyên chức năng.
- Khoảng cách và chiều cao card được thu gọn vừa đủ để hàng ba giáo trình nằm trọn trong viewport phổ biến từ 768px chiều cao trở lên.
- Không che nội dung khi viewport desktop thấp hơn mức này; nội dung chính được phép co theo CSS và chỉ dùng cuộn làm phương án an toàn nếu trình duyệt không đủ chiều cao để thao tác.

### Ba bìa đại diện

- Ba component có cùng chiều rộng và chiều cao.
- Kích thước mỗi bìa xấp xỉ tổng chiều ngang của hai bìa nhỏ hiện tại trong khu thư viện.
- Bộ 1 dùng bảng màu xanh nước biển hiện tại.
- Bộ 2 dùng bảng màu cyan và ảnh nền/logo hiện tại của series thứ hai.
- Bộ 3 dùng bảng màu xanh lá và ảnh nền/logo hiện tại của series thứ ba.
- Toàn bộ bìa là vùng bấm; hover nâng nhẹ bìa nhưng không làm thay đổi bố cục.

## Trang thư viện bộ giáo trình

Trang `/thu-vien/[series]` dùng một component chung, nhận cấu hình bộ gồm mã, màu, số quyển và dữ liệu khóa học.

- Bộ 1 hiển thị 6 quyển.
- Bộ 2 hiển thị 6 quyển.
- Bộ 3 hiển thị 8 quyển.
- Các quyển xếp theo chiều dọc, từ số nhỏ đến số lớn.
- Mỗi hàng quyển giữ phong cách bìa tương ứng với bộ và có vùng bấm rõ ràng.
- Chỉ một quyển được mở tại một thời điểm.
- Nhấn quyển đang mở lần nữa sẽ thu gọn.
- Khi mở quyển đã phát hành, danh sách bài xuất hiện ngay dưới hàng quyển.
- Bài đã phát hành dẫn tới route learner hiện có.
- Quyển chưa phát hành hiển thị “Sắp ra mắt” và không tạo liên kết giả.
- Nếu một quyển đã có dữ liệu khóa học nhưng chưa có bài, vùng mở hiển thị “Chưa có bài phát hành”.

## Dữ liệu và tương thích

- Bộ 1 tiếp tục lấy từ `buildTopikShelf()` và dữ liệu published catalog hiện tại.
- Bộ 2 và bộ 3 dùng cấu hình tĩnh về số quyển và trạng thái cho tới khi CMS có dữ liệu tương ứng.
- Cấu hình ba bộ được đặt trong module riêng để Home, sidebar và trang thư viện dùng chung, tránh sai khác số lượng hoặc màu sắc.
- Không đổi schema Supabase trong phạm vi này.
- Không đổi cách tính tiến độ hay hoàn thành bài học.
- Không xóa route `/tieng-han-th` hoặc `/courses/[courseSlug]`; liên kết cũ vẫn hoạt động.

## Trạng thái và lỗi

- Series ngoài `1`, `2`, `3` trả về 404.
- Khi dữ liệu published catalog lỗi hoặc trống, bộ 1 vẫn dùng fallback TOPIK 1 hiện có và các quyển còn lại hiển thị khóa an toàn.
- Link bài học tiếp tục áp dụng yêu cầu đăng nhập hiện tại.
- Thông báo “Sắp ra mắt” ngắn gọn, không điều hướng sang trang trống.

## Responsive và khả năng truy cập

- Desktop: Home cố định theo viewport; ba bìa nằm một hàng.
- Tablet/mobile: Home vẫn cuộn; ba bìa chuyển thành bố cục thích hợp với chiều rộng màn hình.
- Bìa và hàng quyển dùng semantic link/button phù hợp.
- Có `aria-label` mô tả “Mở bộ 1”, “Mở quyển 2” thay cho việc phụ thuộc vào màu sắc.
- Trạng thái mở của quyển dùng `aria-expanded`.
- Focus keyboard có viền nhận biết rõ ràng.

## Kiểm thử chấp nhận

1. Sidebar không còn xổ danh sách sách và “Thư viện học” đậm tương đương “Quản lý bộ từ”.
2. Nhấn “Thư viện học” mở `/thu-vien`.
3. Home desktop có đúng ba bìa bằng nhau, chỉ ghi số `1`, `2`, `3`.
4. Home desktop phổ biến không xuất hiện thanh cuộn dọc; mobile vẫn cuộn bình thường.
5. Nhấn bìa `1`, `2`, `3` mở đúng trang bộ tương ứng.
6. Các trang bộ hiển thị đúng 6, 6, 8 quyển.
7. Chỉ một quyển được xổ bài tại một thời điểm.
8. Bài TOPIK đã phát hành vẫn mở đúng learner route và giữ yêu cầu đăng nhập.
9. Quyển chưa phát hành không dẫn tới 404 ngoài ý muốn.
10. Lint, typecheck, test hồi quy và production build đều đạt.

## Ngoài phạm vi

- Biên soạn nội dung thật cho bộ 2 và bộ 3.
- Thay đổi CMS hoặc schema để quản lý series mới.
- Thiết kế lại learner lesson page.
- Thay đổi hệ thống streak, tài khoản, thanh toán hoặc luyện đề.
