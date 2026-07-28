type BackendError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type UserFacingError = {
  code: string;
  message: string;
  reference?: string;
};

const domainErrors: Array<{
  match: string;
  code: string;
  message: string;
}> = [
  {
    match: "cannot_remove_last_admin",
    code: "LAST_ADMIN",
    message: "Không thể bỏ quyền của admin cuối cùng trong hệ thống.",
  },
  {
    match: "role_change_reason_required",
    code: "ROLE_REASON_REQUIRED",
    message: "Hãy nhập lý do thay đổi role ít nhất 3 ký tự.",
  },
  {
    match: "unsupported_primary_role",
    code: "UNSUPPORTED_ROLE",
    message: "Role này chưa được hỗ trợ trong màn hình quản lý hiện tại.",
  },
  {
    match: "invalid_credentials",
    code: "INVALID_CREDENTIALS",
    message: "Email hoặc mật khẩu chưa đúng.",
  },
  {
    match: "email_not_confirmed",
    code: "EMAIL_NOT_CONFIRMED",
    message: "Email chưa được xác nhận. Hãy mở email xác nhận rồi đăng nhập lại.",
  },
  {
    match: "user_already_exists",
    code: "USER_ALREADY_EXISTS",
    message: "Email này đã có tài khoản. Hãy đăng nhập hoặc dùng chức năng khôi phục mật khẩu.",
  },
  {
    match: "weak_password",
    code: "WEAK_PASSWORD",
    message: "Mật khẩu chưa đủ mạnh. Hãy dùng mật khẩu dài hơn và khó đoán hơn.",
  },
  {
    match: "signup_disabled",
    code: "SIGNUP_DISABLED",
    message: "Hệ thống đang tạm đóng đăng ký tài khoản mới.",
  },
  {
    match: "over_email_send_rate_limit",
    code: "EMAIL_RATE_LIMIT",
    message: "Bạn đã yêu cầu email quá nhiều lần. Hãy đợi một lúc rồi thử lại.",
  },
  {
    match: "otp_expired",
    code: "OTP_EXPIRED",
    message: "Liên kết xác nhận đã hết hạn. Hãy yêu cầu gửi lại email xác nhận.",
  },
  {
    match: "provider is not enabled",
    code: "AUTH_PROVIDER_DISABLED",
    message: "Phương thức đăng nhập này chưa được bật trong cấu hình hệ thống.",
  },
  {
    match: "invalid_course_module",
    code: "INVALID_COURSE_MODULE",
    message:
      "Chương đã chọn không thuộc khóa học này. Hãy chọn lại đúng khóa học và chương.",
  },
  {
    match: "insufficient_privilege",
    code: "FORBIDDEN",
    message: "Tài khoản của bạn không có quyền thực hiện thao tác này.",
  },
  {
    match: "not_revision_owner",
    code: "NOT_REVISION_OWNER",
    message: "Bạn chỉ có thể sửa bản nháp do chính mình tạo.",
  },
  {
    match: "not_vocabulary_owner",
    code: "NOT_VOCABULARY_OWNER",
    message: "Bạn chỉ có thể sửa từ vựng do chính mình tạo.",
  },
  {
    match: "not_import_owner",
    code: "NOT_IMPORT_OWNER",
    message: "Bạn không có quyền hoàn tất phiên nhập dữ liệu này.",
  },
  {
    match: "revision_not_found",
    code: "REVISION_NOT_FOUND",
    message: "Không tìm thấy phiên bản bài học. Có thể bài đã bị thay đổi hoặc xóa.",
  },
  {
    match: "vocabulary_not_found",
    code: "VOCABULARY_NOT_FOUND",
    message: "Không tìm thấy từ vựng cần thao tác.",
  },
  {
    match: "import_not_found",
    code: "IMPORT_NOT_FOUND",
    message: "Không tìm thấy phiên nhập dữ liệu.",
  },
  {
    match: "revision_not_editable",
    code: "REVISION_NOT_EDITABLE",
    message: "Bài đang được duyệt hoặc đã hoàn tất nên không thể chỉnh sửa.",
  },
  {
    match: "vocabulary_not_editable",
    code: "VOCABULARY_NOT_EDITABLE",
    message: "Từ vựng đã được phát hành hoặc đang được xử lý nên không thể sửa trực tiếp.",
  },
  {
    match: "published_vocabulary_cannot_delete",
    code: "PUBLISHED_VOCABULARY_CANNOT_DELETE",
    message:
      "Từ đã được phát hành nên không thể xóa. Hãy tạo phiên bản nội dung mới nếu cần thay thế.",
  },
  {
    match: "vocabulary_used_by_lessons",
    code: "VOCABULARY_USED_BY_LESSONS",
    message:
      "Từ đang được dùng trong một hoặc nhiều bài học. Hãy gỡ từ khỏi các bài đó trước khi xóa.",
  },
  {
    match: "active_revision_cannot_delete",
    code: "ACTIVE_REVISION_CANNOT_DELETE",
    message:
      "Bài đang chờ duyệt, đã duyệt hoặc đang phát hành nên không thể xóa. Hãy tạm gỡ hoặc đưa bài về trạng thái có thể chỉnh sửa trước.",
  },
  {
    match: "revision_not_deletable",
    code: "REVISION_NOT_DELETABLE",
    message: "Không thể xóa bài ở trạng thái hiện tại.",
  },
  {
    match: "invalid_content_type",
    code: "INVALID_CONTENT_TYPE",
    message: "Loại nội dung này không hỗ trợ thao tác vừa chọn.",
  },
  {
    match: "invalid_vocabulary_selection",
    code: "INVALID_VOCABULARY_SELECTION",
    message:
      "Bộ từ chứa từ không tồn tại hoặc không thuộc quyền sử dụng của bạn. Hãy tải lại thư viện và chọn lại.",
  },
  {
    match: "invalid_content_transition",
    code: "INVALID_CONTENT_TRANSITION",
    message:
      "Không thể chuyển bài sang trạng thái này. Hãy tải lại để xem trạng thái mới nhất.",
  },
  {
    match: "revision_not_in_review",
    code: "REVISION_NOT_IN_REVIEW",
    message: "Bài này không còn ở trạng thái chờ duyệt.",
  },
  {
    match: "revision_not_published",
    code: "REVISION_NOT_PUBLISHED",
    message: "Bài này chưa được phát hành hoặc đã được tạm gỡ.",
  },
  {
    match: "source_revision_not_reusable",
    code: "REVISION_NOT_REUSABLE",
    message: "Chưa thể tạo phiên bản mới từ trạng thái hiện tại của bài.",
  },
  {
    match: "import_not_ready",
    code: "IMPORT_NOT_READY",
    message: "Phiên nhập còn dòng lỗi. Hãy xử lý các dòng chưa hợp lệ trước.",
  },
  {
    match: "lesson_requires_four_vocabulary_items",
    code: "LESSON_NEEDS_VOCABULARY",
    message: "Bài học cần ít nhất 4 từ vựng trước khi gửi duyệt.",
  },
  {
    match: "lesson_requires_four_distinct_vocabulary_pairs",
    code: "LESSON_NEEDS_DISTINCT_MEANINGS",
    message: "Bài học cần ít nhất 4 cặp từ Hàn–Việt có nghĩa phân biệt.",
  },
  {
    match: "lesson_course_missing",
    code: "LESSON_COURSE_MISSING",
    message: "Khóa học của bài không tồn tại. Hãy chọn lại khóa học.",
  },
  {
    match: "lesson_module_missing",
    code: "LESSON_MODULE_MISSING",
    message: "Chương của bài không tồn tại. Hãy chọn lại chương.",
  },
  {
    match: "lesson_catalog_parents_not_published",
    code: "PARENT_NOT_PUBLISHED",
    message: "Khóa học hoặc chương cha chưa được công khai nên chưa thể phát hành bài.",
  },
  {
    match: "lesson_content_sections_invalid",
    code: "INVALID_LESSON_SECTIONS",
    message: "Một phần nội dung bài học chưa đúng cấu trúc. Hãy kiểm tra lại ngữ pháp và ví dụ.",
  },
  {
    match: "payload_identity_mismatch",
    code: "CONTENT_IDENTITY_MISMATCH",
    message: "ID hoặc slug trong bài không đồng nhất. Hãy tải lại trang và nhập lại.",
  },
  {
    match: "content_id_mismatch",
    code: "CONTENT_ID_MISMATCH",
    message: "ID bài học không thể thay đổi sau khi đã tạo bản nháp.",
  },
  {
    match: "course_not_found",
    code: "COURSE_NOT_FOUND",
    message: "Không tìm thấy khóa học đã chọn.",
  },
  {
    match: "invalid_course",
    code: "INVALID_COURSE",
    message: "Thông tin khóa học chưa hợp lệ. Hãy kiểm tra ID, slug, tên và số bài dự kiến.",
  },
  {
    match: "invalid_module",
    code: "INVALID_MODULE",
    message: "Thông tin chương chưa hợp lệ. Hãy kiểm tra ID, slug, tên và thứ tự.",
  },
];

function asBackendError(error: unknown): BackendError {
  if (!error || typeof error !== "object") return {};
  return error as BackendError;
}

function searchable(error: BackendError) {
  return [error.code, error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function toUserFacingError(
  error: unknown,
  fallback = "Thao tác chưa hoàn tất. Vui lòng thử lại.",
): UserFacingError {
  const backend = asBackendError(error);
  const text = searchable(backend);
  const vocabularyDependencyMarker = "vocabulary_used_by_lessons:";
  const dependencyIndex =
    backend.message?.toLowerCase().indexOf(vocabularyDependencyMarker) ?? -1;
  if (dependencyIndex >= 0 && backend.message) {
    const lessonNames = backend.message
      .slice(dependencyIndex + vocabularyDependencyMarker.length)
      .trim()
      .slice(0, 240);
    return {
      code: "VOCABULARY_USED_BY_LESSONS",
      message: lessonNames
        ? `Từ đang được dùng trong bài: ${lessonNames}. Hãy gỡ từ khỏi bài trước khi xóa.`
        : "Từ đang được dùng trong một hoặc nhiều bài học. Hãy gỡ từ khỏi các bài đó trước khi xóa.",
    };
  }
  const domain = domainErrors.find(({ match }) => text.includes(match));
  if (domain) return { code: domain.code, message: domain.message };

  switch (backend.code) {
    case "23505":
      return {
        code: "DUPLICATE",
        message: "ID, slug hoặc dữ liệu này đã tồn tại. Hãy dùng một giá trị khác.",
      };
    case "23502":
      return {
        code: "REQUIRED_VALUE_MISSING",
        message: "Một trường bắt buộc đang bị thiếu. Hãy kiểm tra lại toàn bộ biểu mẫu.",
      };
    case "23503":
      return {
        code: "RELATED_DATA_MISSING",
        message: "Dữ liệu liên quan không còn tồn tại. Hãy tải lại trang và chọn lại.",
      };
    case "23514":
    case "22P02":
      return {
        code: "INVALID_VALUE",
        message: "Một giá trị không đúng định dạng hoặc ngoài phạm vi cho phép.",
      };
    case "42501":
      return {
        code: "FORBIDDEN",
        message: "Tài khoản của bạn không có quyền thực hiện thao tác này.",
      };
    case "PGRST116":
      return {
        code: "NOT_FOUND",
        message: "Không tìm thấy dữ liệu hoặc bạn không có quyền xem dữ liệu này.",
      };
    case "PGRST202":
      return {
        code: "DATABASE_SCHEMA_OUTDATED",
        message: "Database chưa được cập nhật đúng phiên bản. Quản trị viên cần chạy migration mới nhất.",
      };
    case "40001":
    case "40P01":
      return {
        code: "CONCURRENT_UPDATE",
        message: "Dữ liệu vừa được người khác cập nhật. Hãy tải lại trang rồi thử lại.",
      };
    case "57014":
      return {
        code: "TIMEOUT",
        message: "Yêu cầu mất quá nhiều thời gian. Hãy thử lại sau ít phút.",
      };
  }

  const reference = crypto.randomUUID().slice(0, 8).toUpperCase();
  console.error("[Harutopik error]", {
    reference,
    code: backend.code,
    message: backend.message,
    details: backend.details,
    hint: backend.hint,
  });
  return {
    code: "UNEXPECTED_ERROR",
    message: `${fallback} Nếu lỗi tiếp diễn, hãy gửi mã ${reference} cho quản trị viên.`,
    reference,
  };
}
