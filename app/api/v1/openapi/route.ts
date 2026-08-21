import { apiSuccess } from "@/lib/api/responses";

export const dynamic = "force-static";

export function GET() {
  return apiSuccess(
    {
      openapi: "3.1.0",
      info: {
        title: "Harutopik API",
        version: "1.0.0",
        description: "API dùng chung cho Harutopik Web và Mobile.",
      },
      servers: [{ url: "/api/v1" }],
      paths: {
        "/catalog": { get: { summary: "Catalog khóa học đã xuất bản" } },
        "/me": {
          get: {
            summary: "Hồ sơ người học hiện tại",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
          patch: {
            summary: "Cập nhật hồ sơ và hoàn tất onboarding",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
        },
        "/vocabulary-lists": {
          get: {
            summary: "Danh sách các bộ từ cá nhân",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
          post: {
            summary: "Tạo bộ từ cá nhân",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
        },
        "/vocabulary-lists/{listId}/items": {
          post: {
            summary: "Lưu từ vào một bộ",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
        },
        "/vocabulary-lists/{listId}/custom-items": {
          post: {
            summary:
              "Tạo từ custom trong một bộ, tối đa 50 từ cho mỗi tài khoản",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
        },
        "/entitlements": {
          get: {
            summary: "Quyền truy cập hiện tại",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
        },
        "/learning/events": {
          post: {
            summary: "Gửi sự kiện học idempotent",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
        },
        "/learning/session": {
          get: {
            summary: "Lấy phiên học đang dở theo bài và version",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
          put: {
            summary: "Lưu snapshot phiên học đang dở",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
          delete: {
            summary: "Xóa phiên học để bắt đầu lại",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
        },
        "/learning/progress": {
          get: {
            summary: "Lấy tiến độ một hoặc nhiều bài học hiện tại",
            security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
          cookieAuth: { type: "apiKey", in: "cookie", name: "sb-session" },
        },
      },
    },
    { cacheControl: "public, max-age=3600" },
  );
}
