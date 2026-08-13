"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 10 * 1024 * 1024;
const outputWidth = 1200;
const outputHeight = 900;

async function cropExamImage(source: Blob, zoom: number, preserveFullImage: boolean) {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Trình duyệt không thể xử lý ảnh này.");
  }

  const baseRatio = preserveFullImage
    ? Math.min(outputWidth / bitmap.width, outputHeight / bitmap.height)
    : Math.max(outputWidth / bitmap.width, outputHeight / bitmap.height);
  const ratio = baseRatio * (zoom / 100);
  const width = bitmap.width * ratio;
  const height = bitmap.height * ratio;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(bitmap, (outputWidth - width) / 2, (outputHeight - height) / 2, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Không thể tạo ảnh WebP.")),
      "image/webp",
      0.9,
    );
  });
}

export function ExamImageUpload({
  examId,
  value,
  onChange,
  onSaved,
  label,
  compact = false,
  disabled = false,
  preserveFullImage = false,
}: {
  examId: string;
  value: string;
  onChange: (url: string) => void;
  onSaved?: (url: string) => void;
  label: string;
  compact?: boolean;
  disabled?: boolean;
  preserveFullImage?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Blob | null>(null);
  const [sourcePreview, setSourcePreview] = useState("");
  const [savedPreview, setSavedPreview] = useState("");
  const [zoom, setZoom] = useState(100);
  const [uploadedPath, setUploadedPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingSource, setLoadingSource] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
  }, [sourcePreview]);

  useEffect(() => () => {
    if (savedPreview) URL.revokeObjectURL(savedPreview);
  }, [savedPreview]);

  const previewUrl = savedPreview || sourcePreview || value;
  const previewScale = source && !savedPreview ? zoom / 100 : 1;

  async function upload(sourceFile: Blob, nextZoom: number) {
    setUploading(true);
    setMessage("Đang căn và tải ảnh...");
    try {
      const processed = await cropExamImage(sourceFile, nextZoom, preserveFullImage);
      const path = `${examId}/answers/${crypto.randomUUID()}.webp`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("exam-images").upload(path, processed, {
        contentType: "image/webp",
        cacheControl: "31536000",
      });
      if (error) throw new Error(`Tải ảnh thất bại: ${error.message}`);

      const previousPath = uploadedPath;
      const url = supabase.storage.from("exam-images").getPublicUrl(path).data.publicUrl;
      if (savedPreview) URL.revokeObjectURL(savedPreview);
      setSavedPreview(URL.createObjectURL(processed));
      setUploadedPath(path);
      onChange(url);
      onSaved?.(url);
      if (previousPath) await supabase.storage.from("exam-images").remove([previousPath]);
      setMessage(preserveFullImage
        ? "Ảnh đã được giữ trọn trong khung 4:3 và đang được đồng bộ."
        : "Ảnh đã được căn theo khung 4:3 và đang được đồng bộ.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xử lý ảnh.");
    } finally {
      setUploading(false);
    }
  }

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!acceptedImageTypes.has(file.type)) {
      setMessage("Chỉ hỗ trợ JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > maxImageBytes) {
      setMessage("Ảnh vượt quá 10 MB.");
      return;
    }

    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    if (savedPreview) URL.revokeObjectURL(savedPreview);
    setSource(file);
    setSourcePreview(URL.createObjectURL(file));
    setSavedPreview("");
    setZoom(100);
    await upload(file, 100);
  }

  async function applyZoom() {
    if (!source || uploading) return;
    await upload(source, zoom);
  }

  function changeZoom(nextZoom: number) {
    if (savedPreview) URL.revokeObjectURL(savedPreview);
    setSavedPreview("");
    setZoom(nextZoom);
  }

  async function editExistingImage() {
    if (!value || source || uploading || loadingSource) return;
    setLoadingSource(true);
    setMessage("Đang mở ảnh hiện tại để chỉnh...");
    try {
      const response = await fetch(value, { cache: "no-store" });
      if (!response.ok) throw new Error("Không thể tải ảnh hiện tại để chỉnh.");
      const blob = await response.blob();
      if (!acceptedImageTypes.has(blob.type)) throw new Error("Ảnh hiện tại không thuộc định dạng JPG, PNG hoặc WebP.");
      if (sourcePreview) URL.revokeObjectURL(sourcePreview);
      if (savedPreview) URL.revokeObjectURL(savedPreview);
      setSource(blob);
      setSourcePreview(URL.createObjectURL(blob));
      setSavedPreview("");
      setZoom(100);
      setMessage("Kéo thanh để chỉnh kích thước, sau đó bấm “Lưu chỉnh ảnh”.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể mở ảnh hiện tại để chỉnh.");
    } finally {
      setLoadingSource(false);
    }
  }

  async function removeImage() {
    if (uploadedPath) await createClient().storage.from("exam-images").remove([uploadedPath]);
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    if (savedPreview) URL.revokeObjectURL(savedPreview);
    setSource(null);
    setSourcePreview("");
    setSavedPreview("");
    setUploadedPath("");
    setZoom(100);
    setMessage("Đã bỏ ảnh.");
    onChange("");
    onSaved?.("");
  }

  return <div className={`rounded-2xl border border-sky-100 bg-white ${compact ? "p-3" : "p-4"}`}>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseImage(event)} className="sr-only" />
    <button
      type="button"
      disabled={disabled || uploading}
      onClick={() => inputRef.current?.click()}
      className="w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        role="img"
        aria-label={`Xem trước ${label}`}
        className={`${compact
          ? "mx-auto aspect-[4/3] w-full max-w-[420px]"
          : "h-52 w-full sm:h-64"
        } relative block overflow-hidden rounded-xl border border-slate-200 bg-slate-100`}
      >
        {previewUrl && <span
          aria-hidden="true"
          className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-transform duration-200"
          style={{ backgroundImage: `url("${previewUrl}")`, transform: `scale(${previewScale})` }}
        />}
        {!previewUrl && <span className="flex h-full items-center justify-center px-4 text-center text-sm font-black text-slate-400">+ {label}</span>}
      </span>
      <span className="mt-2 block text-center text-xs font-black text-sky-700">{uploading ? "Đang tải..." : value ? "Chọn ảnh khác" : "Chọn ảnh"}</span>
    </button>
    {value && <button type="button" onClick={() => setPreviewOpen(true)} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">Xem trước ảnh</button>}
    {value && !source && !disabled && <button type="button" disabled={uploading || loadingSource} onClick={() => void editExistingImage()} className="mt-2 w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-800 disabled:opacity-50">{loadingSource ? "Đang mở ảnh..." : "Chỉnh ảnh hiện tại"}</button>}
    {source && <div className="mt-3 rounded-xl bg-sky-50 p-3">
      <div className="flex items-center justify-between text-xs font-black text-slate-600"><span>Chỉnh kích thước ảnh</span><span>{zoom}%</span></div>
      <input type="range" min="50" max="180" step="5" value={zoom} disabled={uploading || disabled} onChange={(event) => changeZoom(Number(event.target.value))} className="mt-2 w-full accent-sky-600" />
      <button type="button" disabled={uploading || disabled} onClick={() => void applyZoom()} className="mt-2 w-full rounded-xl bg-sky-700 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{uploading ? "Đang lưu..." : `Lưu ảnh ở ${zoom}%`}</button>
    </div>}
    {value && !disabled && <button type="button" disabled={uploading} onClick={() => void removeImage()} className="mt-2 w-full text-center text-xs font-black text-red-600 disabled:opacity-50">Bỏ ảnh</button>}
    {message && <p aria-live="polite" className={`mt-2 text-center text-[11px] font-bold ${message.includes("thất bại") || message.startsWith("Chỉ") || message.startsWith("Ảnh vượt") || message.startsWith("Không thể") ? "text-red-600" : "text-emerald-700"}`}>{message}</p>}
    {previewOpen && previewUrl && <div role="dialog" aria-modal="true" aria-label={`Xem trước ${label}`} className="fixed inset-0 z-[100] grid place-items-center p-4">
      <button type="button" aria-label="Đóng nền xem trước ảnh" onClick={() => setPreviewOpen(false)} className="absolute inset-0 bg-slate-950/80" />
      <div className="relative z-10 w-full max-w-5xl rounded-3xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-4"><p className="font-black text-slate-900">Xem trước ảnh sẽ hiển thị</p><button type="button" aria-label="Đóng xem trước ảnh" onClick={() => setPreviewOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-xl font-black text-white">×</button></div>
        <span role="img" aria-label={`Ảnh xem trước ${label}`} className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <span aria-hidden="true" className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-transform duration-200" style={{ backgroundImage: `url("${previewUrl}")`, transform: `scale(${previewScale})` }} />
        </span>
      </div>
    </div>}
  </div>;
}
