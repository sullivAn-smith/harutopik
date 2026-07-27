# Harutopik Release Checklist

## Bắt buộc trước production

- Dùng Node.js 24 LTS.
- Tạo Supabase production project và chạy migration theo thứ tự.
- Cấu hình URL, publishable key và service role key ở server.
- Cấu hình Google OAuth theo `docs/GOOGLE_AUTH_SETUP.md` và kiểm tra callback production.
- Tạo, xác minh payOS merchant/channel và đăng ký webhook HTTPS.
- Thay `NEXT_PUBLIC_SITE_URL` bằng domain production.
- Cấu hình analytics/error endpoint hoặc chủ động để trống.
- Chạy `npm run verify`.
- Chạy thử một giao dịch payOS sandbox/test và một hoàn tiền thủ công.
- Kiểm tra role admin đầu tiên bằng truy vấn database có kiểm soát.
- Thiết lập backup PostgreSQL, cảnh báo lỗi và cảnh báo webhook thất bại.

## Phát hành

1. Áp migration trước khi deploy code.
2. Deploy preview/staging và chạy smoke test.
3. Deploy production.
4. Kiểm tra `/robots.txt`, `/sitemap.xml`, `/api/v1/openapi`.
5. Kiểm tra đăng ký, xác nhận email, học bài, đồng bộ và thanh toán.
6. Theo dõi error rate, Core Web Vitals và webhook trong 30 phút đầu.

## Rollback

- Rollback code về release trước.
- Không tự động rollback migration phá hủy dữ liệu.
- Tắt checkout bằng cách thu hồi biến payOS khi cần.
- Entitlement đã cấp chỉ thu hồi bằng thao tác được ghi audit log.
