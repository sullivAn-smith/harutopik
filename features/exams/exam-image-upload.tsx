"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 10 * 1024 * 1024;
const outputWidth = 1200;
const outputHeight = 900;

async function cropExamImage(source: Blob, zoom: number) {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Trình duyệt không thể xử lý ảnh này.");
  }

  const ratio = Math.max(outputWidth / bitmap.width, outputHeight / bitmap.height) * (zoom / 100);
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
  label,
  compact = false,
  disabled = false,
}: {
  examId: string;
  value: string;
  onChange: (url: string) => void;
  label: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Blob | null>(null);
  const [sourcePreview, setSourcePreview] = useState("");
  const [zoom, setZoom] = useState(100);
  const [appliedZoom, setAppliedZoom] = useState(100);
  const [uploadedPath, setUploadedPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
  }, [sourcePreview]);

  const previewUrl = sourcePreview || value;

  async function upload(sourceFile: Blob, nextZoom: number) {
    setUploading(true);
    setMessage("Đang cắt và tải ảnh...");
    try {
      const processed = await cropExamImage(sourceFile, nextZoom);
      const path = `${examId}/answers/${crypto.randomUUID()}.webp`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("exam-images").upload(path, processed, {
        contentType: "image/webp",
        cacheControl: "31536000",
      });
      if (error) throw new Error(`Tải ảnh thất bại: ${error.message}`);

      const previousPath = uploadedPath;
      const url = supabase.storage.from("exam-images").getPublicUrl(path).data.publicUrl;
      setUploadedPath(path);
      setAppliedZoom(nextZoom);
      onChange(url);
      if (previousPath) await supabase.storage.from("exam-images").remove([previousPath]);
      setMessage("Ảnh đã được căn theo khung 4:3.");
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
    setSource(file);
    setSourcePreview(URL.createObjectURL(file));
    setZoom(100);
    setAppliedZoom(100);
    await upload(file, 100);
  }

  async function applyZoom() {
    if (!source || uploading || zoom === appliedZoom) return;
    await upload(source, zoom);
  }

  async function removeImage() {
    if (uploadedPath) await createClient().storage.from("exam-images").remove([uploadedPath]);
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    setSource(null);
    setSourcePreview("");
    setUploadedPath("");
    setZoom(100);
    setAppliedZoom(100);
    setMessage("Đã bỏ ảnh khỏi đáp án.");
    onChange("");
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
          ? "mx-auto aspect-[4/3] w-full max-w-[560px]"
          : "h-52 w-full sm:h-64"
        } relative block overflow-hidden rounded-xl border border-slate-200 bg-slate-100`}
      >
        {previewUrl && <span
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-200"
          style={{ backgroundImage: `url("${previewUrl}")`, transform: `scale(${source ? zoom / 100 : 1})` }}
        />}
        {!previewUrl && <span className="flex h-full items-center justify-center px-4 text-center text-sm font-black text-slate-400">+ {label}</span>}
      </span>
      <span className="mt-2 block text-center text-xs font-black text-sky-700">{uploading ? "Đang tải..." : value ? "Chọn ảnh khác" : "Chọn ảnh"}</span>
    </button>
    {source && <div className="mt-3">
      <div className="flex items-center justify-between text-xs font-black text-slate-600"><span>Phóng/thu để cắt ảnh</span><span>{zoom}%</span></div>
      <input type="range" min="100" max="180" step="5" value={zoom} disabled={uploading || disabled} onChange={(event) => setZoom(Number(event.target.value))} onPointerUp={() => void applyZoom()} onKeyUp={() => void applyZoom()} onBlur={() => void applyZoom()} className="mt-2 w-full accent-sky-600" />
    </div>}
    {value && !disabled && <button type="button" disabled={uploading} onClick={() => void removeImage()} className="mt-2 w-full text-center text-xs font-black text-red-600 disabled:opacity-50">Bỏ ảnh</button>}
    {message && <p aria-live="polite" className={`mt-2 text-center text-[11px] font-bold ${message.includes("thất bại") || message.startsWith("Chỉ") || message.startsWith("Ảnh vượt") ? "text-red-600" : "text-emerald-700"}`}>{message}</p>}
  </div>;
}
