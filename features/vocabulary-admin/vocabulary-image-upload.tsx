"use client";

import { ChangeEvent, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const imageBucket = "vocabulary-images";
const maxImageBytes = 2 * 1024 * 1024;
const acceptedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function extensionFor(file: File) {
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/png") return "png";
  return "jpg";
}

export function VocabularyImageUpload({
  defaultValue,
  onValueChange,
}: {
  defaultValue?: string | null;
  onValueChange?: (imageUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadedPath, setUploadedPath] = useState("");

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!acceptedImageTypes.has(file.type)) {
      setMessage("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > maxImageBytes) {
      setMessage("Ảnh vượt quá 2 MB. Hãy nén hoặc chọn ảnh nhỏ hơn.");
      return;
    }

    setUploading(true);
    setMessage("Đang tải ảnh lên kho lưu trữ...");
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setUploading(false);
      setMessage("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
      return;
    }

    const storagePath = `${user.id}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const { error: uploadError } = await supabase.storage
      .from(imageBucket)
      .upload(storagePath, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      setUploading(false);
      setMessage(`Chưa thể tải ảnh lên: ${uploadError.message}`);
      return;
    }

    const { data } = supabase.storage
      .from(imageBucket)
      .getPublicUrl(storagePath);
    setImageUrl(data.publicUrl);
    onValueChange?.(data.publicUrl);
    setUploadedPath(storagePath);
    setUploading(false);
    setMessage("Ảnh đã được tải lên CDN. Hãy lưu từ vựng để hoàn tất.");
  }

  async function removeImage() {
    if (uploadedPath) {
      const supabase = createClient();
      await supabase.storage.from(imageBucket).remove([uploadedPath]);
    }
    setImageUrl("");
    onValueChange?.("");
    setUploadedPath("");
    setMessage("Đã bỏ ảnh khỏi biểu mẫu.");
  }

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <input type="hidden" name="imageUrl" value={imageUrl} />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void chooseImage(event)}
          className="sr-only"
          aria-label="Chọn ảnh minh họa từ vựng"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-40 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sky-300 bg-white/80 px-5 py-6 text-center transition hover:border-brand-500 hover:bg-white disabled:cursor-wait disabled:opacity-60"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
            {uploading ? "…" : "↑"}
          </span>
          <span className="mt-3 font-black text-ink-900">
            {uploading
              ? "Đang tải ảnh lên..."
              : imageUrl
                ? "Chọn ảnh khác"
                : "Chọn ảnh minh họa"}
          </span>
          <span className="mt-1 text-sm text-ink-600">
            JPG, PNG hoặc WebP · tối đa 2 MB
          </span>
        </button>
        <p
          aria-live="polite"
          className={`mt-3 text-sm font-bold ${
            message.startsWith("Chưa") ||
            message.startsWith("Chỉ") ||
            message.startsWith("Ảnh vượt") ||
            message.startsWith("Phiên")
              ? "text-red-600"
              : "text-emerald-700"
          }`}
        >
          {message}
        </p>
      </div>

      <div className="rounded-3xl border border-white/80 bg-white p-3 shadow-sm">
        <div
          role="img"
          aria-label="Xem trước ảnh minh họa"
          className="aspect-square overflow-hidden rounded-2xl bg-slate-100 bg-cover bg-center"
          style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
        >
          {!imageUrl && (
            <div className="flex h-full items-center justify-center px-5 text-center text-sm font-bold text-slate-400">
              Ảnh xem trước sẽ xuất hiện ở đây
            </div>
          )}
        </div>
        {imageUrl && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => void removeImage()}
            className="mt-3 w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Bỏ ảnh
          </button>
        )}
      </div>
    </div>
  );
}
