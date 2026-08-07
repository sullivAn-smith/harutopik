"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const imageBucket = "vocabulary-images";
const maxImageBytes = 2 * 1024 * 1024;
const acceptedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const outputWidth = 1120;
const outputHeight = 800;
const imageScaleParam = "haru_image_scale";

function readSavedImageScale(imageUrl?: string | null) {
  if (!imageUrl) return 100;
  try {
    const value = Number(new URL(imageUrl).searchParams.get(imageScaleParam));
    return Number.isFinite(value) && value >= 45 && value <= 125 ? value : 100;
  } catch {
    return 100;
  }
}

function saveImageScale(imageUrl: string, scale: number) {
  const url = new URL(imageUrl);
  url.searchParams.set(imageScaleParam, String(scale));
  return url.toString();
}

async function resizeForFlashcard(source: Blob, scale: number) {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Trình duyệt không thể xử lý ảnh này.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputWidth, outputHeight);
  const ratio = Math.min(
    outputWidth / bitmap.width,
    outputHeight / bitmap.height,
  ) * (scale / 100);
  const width = bitmap.width * ratio;
  const height = bitmap.height * ratio;
  context.drawImage(
    bitmap,
    (outputWidth - width) / 2,
    (outputHeight - height) / 2,
    width,
    height,
  );
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Không thể tạo ảnh WebP.")),
      "image/webp",
      0.9,
    );
  });
}

export function VocabularyImageUpload({
  defaultValue,
  onValueChange,
  onUploadingChange,
  previewLabel,
}: {
  defaultValue?: string | null;
  onValueChange?: (imageUrl: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  previewLabel?: string;
}) {
  const initialImageScale = readSavedImageScale(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadedPath, setUploadedPath] = useState("");
  const [sourceImage, setSourceImage] = useState<Blob | null>(null);
  const [imageScale, setImageScale] = useState(initialImageScale);
  const [appliedImageScale, setAppliedImageScale] = useState(initialImageScale);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewScale = (imageScale / appliedImageScale) * 100;

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [onUploadingChange, uploading]);

  async function uploadImage(source: Blob, scale: number) {
    setUploading(true);
    setMessage("Đang căn ảnh và tải lên kho lưu trữ...");
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");

    const processedImage = await resizeForFlashcard(source, scale);
    const storagePath = `${user.id}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(imageBucket)
      .upload(storagePath, processedImage, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: false,
      });
    if (uploadError) throw new Error(`Chưa thể tải ảnh lên: ${uploadError.message}`);

    const previousUploadedPath = uploadedPath;
    const { data } = supabase.storage.from(imageBucket).getPublicUrl(storagePath);
    const scaledPublicUrl = saveImageScale(data.publicUrl, scale);
    setImageUrl(scaledPublicUrl);
    onValueChange?.(scaledPublicUrl);
    setUploadedPath(storagePath);
    setAppliedImageScale(scale);
    if (previousUploadedPath) {
      await supabase.storage.from(imageBucket).remove([previousUploadedPath]);
    }
  }

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

    setSourceImage(file);
    setImageScale(100);
    setAppliedImageScale(100);
    try {
      await uploadImage(file, 100);
      setMessage("Ảnh đã được căn theo khung flashcard. Hãy lưu từ vựng để hoàn tất.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xử lý ảnh.");
    } finally {
      setUploading(false);
    }
  }

  async function applyImageScale() {
    if (!imageUrl || uploading || imageScale === appliedImageScale) return;
    try {
      let source = sourceImage;
      if (!source) {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error("Không thể tải ảnh hiện tại để chỉnh kích thước.");
        source = await response.blob();
        setSourceImage(source);
      }
      await uploadImage(source, imageScale);
      setMessage("Đã áp dụng kích thước mới. Hãy lưu từ vựng để hoàn tất.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể chỉnh kích thước ảnh.");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage() {
    if (uploadedPath) {
      const supabase = createClient();
      await supabase.storage.from(imageBucket).remove([uploadedPath]);
    }
    setImageUrl("");
    onValueChange?.("");
    setUploadedPath("");
    setSourceImage(null);
    setImageScale(100);
    setAppliedImageScale(100);
    setPreviewOpen(false);
    setMessage("Đã bỏ ảnh khỏi biểu mẫu.");
  }

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
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

        {imageUrl && (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-white/80 p-4">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="vocabulary-image-scale" className="font-black text-ink-800">
                Kích thước ảnh
              </label>
              <output htmlFor="vocabulary-image-scale" className="rounded-lg bg-sky-100 px-3 py-1 text-sm font-black text-sky-800">
                {imageScale}%
              </output>
            </div>
            <input
              id="vocabulary-image-scale"
              type="range"
              min="45"
              max="125"
              step="5"
              value={imageScale}
              disabled={uploading}
              onChange={(event) => setImageScale(Number(event.target.value))}
              onPointerUp={() => void applyImageScale()}
              onKeyUp={() => void applyImageScale()}
              onBlur={() => void applyImageScale()}
              className="mt-3 w-full accent-sky-600"
            />
            <div className="mt-1 flex justify-between text-xs font-bold text-ink-500">
              <span>Nhỏ</span><span>Lớn</span>
            </div>
            <p className="mt-3 text-center text-xs font-bold text-sky-800">
              Kéo và thả thanh trượt, sau đó bấm Lưu ở cuối trang.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/80 bg-white p-3 shadow-sm">
        <div
          role="img"
          aria-label="Xem trước ảnh minh họa"
          className="aspect-[7/5] overflow-hidden rounded-2xl bg-slate-100 bg-center bg-no-repeat"
          style={imageUrl ? {
            backgroundImage: `url("${imageUrl}")`,
            backgroundSize: `${previewScale}% auto`,
          } : undefined}
        >
          {!imageUrl && (
            <div className="flex h-full items-center justify-center px-5 text-center text-sm font-bold text-slate-400">
              Ảnh xem trước sẽ xuất hiện ở đây
            </div>
          )}
        </div>
        {imageUrl && (
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen((open) => !open)}
              className="w-full rounded-xl border border-sky-200 px-4 py-2.5 text-sm font-black text-sky-700 hover:bg-sky-50"
            >
              {previewOpen ? "Đóng xem trước" : "Xem trước như học viên"}
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => void removeImage()}
              className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Bỏ ảnh
            </button>
          </div>
        )}
      </div>

      {imageUrl && previewOpen && (
        <div role="dialog" aria-label="Xem trước flashcard học viên" className="fixed inset-x-4 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-auto rounded-3xl border border-sky-200 bg-[#cbe6ff] p-5 shadow-[0_24px_70px_rgba(16,36,62,.3)] lg:bottom-6 lg:left-auto lg:right-6 lg:top-24 lg:w-[430px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-black uppercase tracking-wider text-sky-900/60">Mặt trước flashcard học viên</p>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/85 text-lg font-black text-[#10243e] shadow-sm hover:bg-white"
              aria-label="Đóng xem trước flashcard"
            >
              ×
            </button>
          </div>
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-[#8ec5ff] to-[#cbe6ff] p-6 text-center">
            <div
              aria-hidden="true"
              className="h-40 w-56 overflow-hidden rounded-2xl border border-white/80 bg-white bg-center bg-no-repeat shadow-[0_10px_24px_rgba(16,36,62,0.14)]"
              style={{
                backgroundImage: `url("${imageUrl}")`,
                backgroundSize: `${previewScale}% auto`,
              }}
            />
            <strong lang="ko" className="font-korean mt-4 text-5xl font-black leading-tight text-[#10243e]">
              {previewLabel?.trim() || "한국어"}
            </strong>
            <span className="mt-4 text-sm font-semibold text-[#10243e]/55">Nhấn để xem nghĩa tiếng Việt</span>
          </div>
        </div>
      )}
    </div>
  );
}
