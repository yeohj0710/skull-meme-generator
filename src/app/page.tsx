"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, RefreshCw, Skull, UploadCloud } from "lucide-react";

type RenderStatus = "idle" | "rendering" | "ready" | "error";

const MAX_OUTPUT_SIDE = 1920;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getOutputSize(image: ImageBitmap) {
  const scale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(image.width, image.height));
  return {
    width: Math.round(image.width * scale),
    height: Math.round(image.height * scale),
  };
}

function drawBasePhoto(ctx: CanvasRenderingContext2D, image: ImageBitmap, width: number, height: number, impact: number) {
  ctx.save();
  ctx.filter = [
    `grayscale(${impact})`,
    `contrast(${1.02 + impact * 0.12})`,
    `saturate(${1 - impact * 0.72})`,
    `brightness(${0.72 - impact * 0.16})`,
  ].join(" ");
  ctx.drawImage(image, 0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.09 + impact * 0.08;
  ctx.filter = "blur(1px)";
  ctx.drawImage(image, -2 - impact * 7, 0, width, height);
  ctx.drawImage(image, 2 + impact * 6, 0, width, height);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number, impact: number) {
  const radius = Math.max(width, height) * 0.72;
  const gradient = ctx.createRadialGradient(width / 2, height * 0.38, 0, width / 2, height / 2, radius);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.58, `rgba(0,0,0,${0.18 + impact * 0.1})`);
  gradient.addColorStop(1, `rgba(0,0,0,${0.62 + impact * 0.18})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = `rgba(0,0,0,${0.1 + impact * 0.12})`;
  ctx.fillRect(0, 0, width, height);
}

function drawNoise(ctx: CanvasRenderingContext2D, width: number, height: number, impact: number) {
  const specks = Math.floor(width * height * (0.012 + impact * 0.016));

  for (let i = 0; i < specks; i += 1) {
    const value = Math.random() > 0.5 ? 255 : 0;
    const alpha = Math.random() * 0.08 + impact * 0.035;
    ctx.fillStyle = `rgba(${value},${value},${value},${alpha})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }
}

function drawScanlines(ctx: CanvasRenderingContext2D, width: number, height: number, impact: number) {
  ctx.save();
  ctx.globalAlpha = 0.08 + impact * 0.06;
  ctx.fillStyle = "#050505";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();
}

function drawShakeSlices(ctx: CanvasRenderingContext2D, width: number, height: number, impact: number) {
  const slices = Math.floor(5 + impact * 12);

  ctx.save();
  ctx.globalAlpha = 0.08 + impact * 0.08;
  for (let i = 0; i < slices; i += 1) {
    const sliceHeight = 3 + Math.random() * (height * 0.018);
    const y = Math.random() * height;
    const shift = (Math.random() - 0.5) * (width * (0.012 + impact * 0.025));
    ctx.drawImage(ctx.canvas, 0, y, width, sliceHeight, shift, y, width, sliceHeight);
  }
  ctx.restore();
}

function drawSkullEmoji(ctx: CanvasRenderingContext2D, width: number, height: number, impact: number) {
  const fontSize = clamp(Math.min(width, height) * (0.065 + impact * 0.085), 38, 180);
  const x = width / 2 + (Math.random() - 0.5) * fontSize * 0.14 * impact;
  const y = height * 0.805 + (Math.random() - 0.5) * fontSize * 0.18 * impact;
  const font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;

  ctx.globalAlpha = 0.26 + impact * 0.14;
  ctx.filter = `blur(${1 + impact * 1.3}px)`;
  ctx.fillText("💀", x - fontSize * 0.1, y + fontSize * 0.06);
  ctx.fillText("💀", x + fontSize * 0.09, y - fontSize * 0.04);

  ctx.globalAlpha = 0.92;
  ctx.filter = "none";
  ctx.shadowColor = "rgba(0,0,0,0.78)";
  ctx.shadowBlur = fontSize * 0.18;
  ctx.shadowOffsetY = fontSize * 0.04;
  ctx.fillText("💀", x, y);
  ctx.restore();
}

type EffectSettings = {
  monochrome: number;
  noise: number;
  skullSize: number;
};

async function renderSkullMeme(file: File, canvas: HTMLCanvasElement, settings: EffectSettings) {
  const bitmap = await createImageBitmap(file);
  const ctx = canvas.getContext("2d", { alpha: false });

  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas is not available.");
  }

  const { width, height } = getOutputSize(bitmap);
  const monochrome = clamp(settings.monochrome / 100, 0, 1);
  const noise = clamp(settings.noise / 100, 0, 1);
  const skullSize = clamp(settings.skullSize / 100, 0.35, 1.35);
  const atmosphere = clamp((monochrome + noise) / 2, 0.05, 1);

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, width, height);

  drawBasePhoto(ctx, bitmap, width, height, monochrome);
  drawShakeSlices(ctx, width, height, noise);
  drawVignette(ctx, width, height, atmosphere);
  drawScanlines(ctx, width, height, noise);
  drawNoise(ctx, width, height, noise);
  drawSkullEmoji(ctx, width, height, skullSize);

  bitmap.close();
}

function fileNameFromUpload(fileName: string) {
  const name = fileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-");
  return `${name || "skull-meme"}-skull.png`;
}

function triggerDownload(canvas: HTMLCanvasElement, sourceFile: File) {
  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileNameFromUpload(sourceFile.name);
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png", 0.96);
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestFileRef = useRef<File | null>(null);
  const [status, setStatus] = useState<RenderStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [monochrome, setMonochrome] = useState(78);
  const [noise, setNoise] = useState(58);
  const [skullSize, setSkullSize] = useState(62);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewAspect, setPreviewAspect] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !file) {
      return;
    }

    triggerDownload(canvas, file);
  }, [file]);

  const processFile = useCallback(
    async (nextFile: File) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      if (!ACCEPTED_TYPES.includes(nextFile.type)) {
        setStatus("error");
        return;
      }

      setFile(nextFile);
      latestFileRef.current = nextFile;
      setStatus("rendering");

      try {
        await renderSkullMeme(nextFile, canvas, { monochrome, noise, skullSize });
        const url = canvas.toDataURL("image/png", 0.95);
        setPreviewUrl(url);
        setPreviewAspect(canvas.width / canvas.height);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    },
    [monochrome, noise, skullSize],
  );

  useEffect(() => {
    const latestFile = latestFileRef.current;
    if (latestFile) {
      void processFile(latestFile);
    }
  }, [monochrome, noise, skullSize, processFile]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      void processFile(selectedFile);
    }
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const selectedFile = event.dataTransfer.files?.[0];
    if (selectedFile) {
      void processFile(selectedFile);
    }
  };

  const ready = status === "ready";

  return (
    <main className="min-h-dvh bg-[#070708] text-zinc-50">
      <section className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center border border-white/15 bg-white text-black">
              <Skull className="size-4" aria-hidden="true" />
            </div>
            <h1 className="truncate text-base font-semibold tracking-normal sm:text-lg">해골 밈 생성기</h1>
          </div>
          <span className="shrink-0 font-mono text-sm text-zinc-500">💀 PNG</span>
        </header>

        <div className="grid flex-1 items-stretch gap-4 py-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <aside className="flex flex-col gap-4">
            <label
              className={[
                "group grid min-h-48 cursor-pointer place-items-center border border-dashed p-6 text-center transition",
                isDragging ? "border-white bg-white/10" : "border-white/18 bg-white/[0.035] hover:bg-white/[0.06]",
              ].join(" ")}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={onFileChange}
              />
              <span className="flex flex-col items-center gap-4">
                <span className="grid size-14 place-items-center bg-white text-black transition group-hover:scale-105">
                  <UploadCloud className="size-6" aria-hidden="true" />
                </span>
                <span className="text-lg font-semibold">이미지 업로드</span>
                <span className="text-sm text-zinc-400">PNG, JPG, WebP, AVIF</span>
              </span>
            </label>

            <div className="border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="monochrome" className="text-sm font-medium text-zinc-200">
                  흑백 정도
                </label>
                <span className="font-mono text-sm text-zinc-300">{monochrome}</span>
              </div>
              <input
                id="monochrome"
                className="mt-4 h-2 w-full accent-white"
                min="0"
                max="100"
                type="range"
                value={monochrome}
                onChange={(event) => setMonochrome(Number(event.target.value))}
              />
            </div>

            <div className="border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="noise" className="text-sm font-medium text-zinc-200">
                  노이즈 정도
                </label>
                <span className="font-mono text-sm text-zinc-300">{noise}</span>
              </div>
              <input
                id="noise"
                className="mt-4 h-2 w-full accent-white"
                min="0"
                max="100"
                type="range"
                value={noise}
                onChange={(event) => setNoise(Number(event.target.value))}
              />
            </div>

            <div className="border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="skullSize" className="text-sm font-medium text-zinc-200">
                  해골 크기
                </label>
                <span className="font-mono text-sm text-zinc-300">{skullSize}</span>
              </div>
              <input
                id="skullSize"
                className="mt-4 h-2 w-full accent-white"
                min="35"
                max="100"
                type="range"
                value={skullSize}
                onChange={(event) => setSkullSize(Number(event.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex h-12 items-center justify-center gap-2 bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus className="size-4" aria-hidden="true" />
                선택
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 border border-white/14 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                disabled={!file || status === "rendering"}
                onClick={() => file && void processFile(file)}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                다시 섞기
              </button>
            </div>

            <button
              className="flex h-13 items-center justify-center gap-2 bg-white px-5 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={!ready}
              onClick={download}
            >
              <Download className="size-4" aria-hidden="true" />
              PNG 다운로드
            </button>

            {status === "error" ? (
              <p className="border border-white/30 bg-white/10 p-3 text-sm text-zinc-200">
                이 이미지는 처리할 수 없어요.
              </p>
            ) : null}

            <p className="mt-auto text-xs text-zinc-500">Developed by yeohj0710.</p>
          </aside>

          <div className="grid min-h-[420px] place-items-center overflow-hidden border border-white/10 bg-black">
            <div className="grid h-full w-full place-items-center p-3">
              <div
                className="relative max-h-full w-full max-w-[min(100%,78dvh)] overflow-hidden border border-white/10 bg-[#101012]"
                style={{ aspectRatio: previewUrl ? previewAspect : 9 / 16 }}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="size-full object-contain" src={previewUrl} alt="생성된 해골 밈" />
                ) : (
                  <div className="grid size-full place-items-center">
                    <div className="grid size-24 place-items-center border border-white/12 text-zinc-500">
                      <UploadCloud className="size-8" aria-hidden="true" />
                    </div>
                  </div>
                )}
                {status === "rendering" ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/72 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">
                    생성 중
                  </div>
                ) : null}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      </section>
    </main>
  );
}
