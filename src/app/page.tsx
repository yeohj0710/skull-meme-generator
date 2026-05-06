"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, RefreshCw, Sparkles, UploadCloud } from "lucide-react";

type RenderStatus = "idle" | "rendering" | "ready" | "error";

const OUTPUT_SIZE = 1200;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap,
  width: number,
  height: number,
) {
  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (imageRatio > canvasRatio) {
    sw = image.height * canvasRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / canvasRatio;
    sy = (image.height - sh) / 2;
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
}

function drawGlitchImage(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap,
  width: number,
  height: number,
  impact: number,
) {
  ctx.save();
  ctx.filter = `contrast(${1.22 + impact * 0.24}) saturate(${0.76 + impact * 0.28}) brightness(0.74)`;
  drawCoverImage(ctx, image, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.34;
  ctx.filter = "contrast(1.5) saturate(1.4)";
  ctx.translate(-10 - impact * 12, 0);
  ctx.fillStyle = "rgba(235, 30, 72, 0.24)";
  ctx.fillRect(0, 0, width + 40, height);
  drawCoverImage(ctx, image, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.25;
  ctx.filter = "contrast(1.35) saturate(1.2)";
  ctx.translate(12 + impact * 10, 0);
  ctx.fillStyle = "rgba(16, 210, 220, 0.2)";
  ctx.fillRect(-40, 0, width + 40, height);
  drawCoverImage(ctx, image, width, height);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 180, width / 2, height / 2, 780);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.58, "rgba(0,0,0,0.2)");
  gradient.addColorStop(1, "rgba(0,0,0,0.86)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawImpactField(ctx: CanvasRenderingContext2D, size: number, impact: number) {
  const cx = size / 2;
  const cy = size / 2;
  const pulse = ctx.createRadialGradient(cx, cy, 20, cx, cy, 460);
  pulse.addColorStop(0, "rgba(255,255,255,0.16)");
  pulse.addColorStop(0.18, "rgba(239,44,83,0.2)");
  pulse.addColorStop(0.52, "rgba(90,255,245,0.06)");
  pulse.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pulse;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 224 + i * 72 + impact * 46, 138 + i * 42, -0.18, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.22 + impact * 0.14;
  ctx.strokeStyle = "rgba(255, 35, 84, 0.9)";
  ctx.lineWidth = 5;
  for (let i = 0; i < 34; i += 1) {
    const angle = (i / 34) * Math.PI * 2;
    const near = 205 + Math.sin(i * 19.4) * 18;
    const far = near + 58 + Math.cos(i * 13.1) * 30;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * near, Math.sin(angle) * near);
    ctx.lineTo(Math.cos(angle) * far, Math.sin(angle) * far);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSkull(ctx: CanvasRenderingContext2D, size: number, impact: number) {
  const cx = size / 2;
  const cy = size / 2 + 28;
  const scale = 1 + impact * 0.08;
  const shakeX = -10 + impact * 18;
  const shakeY = 8 - impact * 6;

  ctx.save();
  ctx.translate(cx + shakeX, cy + shakeY);
  ctx.rotate((-2.5 + impact * 2.5) * (Math.PI / 180));
  ctx.scale(scale, scale);

  ctx.save();
  ctx.shadowColor = "rgba(245, 24, 76, 0.86)";
  ctx.shadowBlur = 54;
  ctx.fillStyle = "rgba(235, 28, 72, 0.42)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 246, 286, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(32, 238, 230, 0.72)";
  ctx.shadowBlur = 38;
  ctx.translate(14, -8);
  ctx.fillStyle = "rgba(37, 219, 224, 0.42)";
  drawSkullSilhouette(ctx);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(255, 255, 255, 0.78)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#f5efe6";
  drawSkullSilhouette(ctx);
  ctx.fill();
  ctx.restore();

  const skullGradient = ctx.createLinearGradient(-190, -270, 160, 220);
  skullGradient.addColorStop(0, "#ffffff");
  skullGradient.addColorStop(0.48, "#e7ddd2");
  skullGradient.addColorStop(1, "#a79a90");
  ctx.fillStyle = skullGradient;
  drawSkullSilhouette(ctx);
  ctx.fill();

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(80, 55, 62, 0.18)";
  ctx.beginPath();
  ctx.ellipse(-48, -86, 126, 150, -0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(68, -70, 124, 146, 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = "#070709";
  drawEye(ctx, -74, -76, -0.24);
  drawEye(ctx, 82, -70, 0.24);
  drawNose(ctx);
  drawTeeth(ctx);

  ctx.strokeStyle = "rgba(15, 15, 18, 0.42)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-146, 8);
  ctx.bezierCurveTo(-100, 44, -74, 64, -32, 76);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(144, 10);
  ctx.bezierCurveTo(100, 42, 70, 62, 30, 76);
  ctx.stroke();

  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-56, -188, 72, 38, -0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSkullSilhouette(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-160, 94);
  ctx.bezierCurveTo(-236, 48, -262, -48, -220, -144);
  ctx.bezierCurveTo(-178, -250, -82, -310, 24, -292);
  ctx.bezierCurveTo(146, -272, 226, -178, 224, -58);
  ctx.bezierCurveTo(222, 20, 194, 64, 148, 94);
  ctx.lineTo(148, 206);
  ctx.bezierCurveTo(148, 234, 122, 252, 96, 238);
  ctx.lineTo(72, 226);
  ctx.lineTo(44, 244);
  ctx.bezierCurveTo(24, 256, 8, 252, -6, 232);
  ctx.lineTo(-20, 212);
  ctx.lineTo(-54, 240);
  ctx.bezierCurveTo(-78, 260, -112, 240, -110, 208);
  ctx.lineTo(-106, 162);
  ctx.lineTo(-142, 170);
  ctx.bezierCurveTo(-176, 178, -198, 134, -160, 94);
  ctx.closePath();
}

function drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(0, 0, 54, 72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "screen";
  const eyeGlow = ctx.createRadialGradient(8, -18, 4, 0, 0, 76);
  eyeGlow.addColorStop(0, "rgba(255,42,86,0.82)");
  eyeGlow.addColorStop(1, "rgba(255,42,86,0)");
  ctx.fillStyle = eyeGlow;
  ctx.fillRect(-86, -98, 172, 196);
  ctx.restore();
}

function drawNose(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(4, 6);
  ctx.bezierCurveTo(-30, 50, -42, 96, -24, 116);
  ctx.bezierCurveTo(-6, 134, 38, 124, 48, 98);
  ctx.bezierCurveTo(56, 70, 30, 28, 4, 6);
  ctx.closePath();
  ctx.fill();
}

function drawTeeth(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(8, 150);
  ctx.fillStyle = "#0b0b0d";
  roundedRect(ctx, -86, -18, 170, 68, 18);
  ctx.fill();

  ctx.strokeStyle = "rgba(247,238,226,0.84)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 24, -12);
    ctx.quadraticCurveTo(i * 20 + 8, 12, i * 22, 46);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-72, 16);
  ctx.lineTo(72, 12);
  ctx.stroke();
  ctx.restore();
}

function drawNoise(ctx: CanvasRenderingContext2D, width: number, height: number, impact: number) {
  const density = 0.035 + impact * 0.03;
  const specks = Math.floor(width * height * density);

  for (let i = 0; i < specks; i += 1) {
    const value = Math.random() > 0.52 ? 255 : 0;
    const alpha = Math.random() * 0.18 + impact * 0.08;
    ctx.fillStyle = `rgba(${value},${value},${value},${alpha})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1 + Math.random() * 1.4, 1 + Math.random() * 1.4);
  }
}

function drawScanlines(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#050505";
  for (let y = 0; y < height; y += 5) {
    ctx.fillRect(0, y, width, 1.4);
  }
  ctx.restore();
}

function drawGlitchSlices(ctx: CanvasRenderingContext2D, width: number, height: number, impact: number) {
  const slices = 20;
  for (let i = 0; i < slices; i += 1) {
    const sliceHeight = 8 + Math.random() * (28 + impact * 24);
    const y = Math.random() * height;
    const shift = (Math.random() - 0.5) * (70 + impact * 96);
    ctx.drawImage(ctx.canvas, 0, y, width, sliceHeight, shift, y, width, sliceHeight);
  }
}

async function renderSkullMeme(file: File, canvas: HTMLCanvasElement, impactValue: number) {
  const bitmap = await createImageBitmap(file);
  const ctx = canvas.getContext("2d", { alpha: false });

  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas is not available.");
  }

  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const impact = clamp(impactValue / 100, 0.05, 1);

  ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  drawGlitchImage(ctx, bitmap, OUTPUT_SIZE, OUTPUT_SIZE, impact);
  drawGlitchSlices(ctx, OUTPUT_SIZE, OUTPUT_SIZE, impact);
  drawVignette(ctx, OUTPUT_SIZE, OUTPUT_SIZE);
  drawImpactField(ctx, OUTPUT_SIZE, impact);
  drawSkull(ctx, OUTPUT_SIZE, impact);

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  drawScanlines(ctx, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.22;
  drawNoise(ctx, OUTPUT_SIZE, OUTPUT_SIZE, impact);
  ctx.restore();

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
  const [impact, setImpact] = useState(82);
  const [autoSave, setAutoSave] = useState(true);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !file) {
      return;
    }

    triggerDownload(canvas, file);
  }, [file]);

  const processFile = useCallback(
    async (nextFile: File, shouldAutoSave = autoSave) => {
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
        await renderSkullMeme(nextFile, canvas, impact);
        const url = canvas.toDataURL("image/png", 0.95);
        setPreviewUrl(url);
        setStatus("ready");

        if (shouldAutoSave) {
          window.setTimeout(() => triggerDownload(canvas, nextFile), 80);
        }
      } catch {
        setStatus("error");
      }
    },
    [autoSave, impact],
  );

  useEffect(() => {
    const latestFile = latestFileRef.current;
    if (latestFile) {
      void processFile(latestFile, false);
    }
  }, [impact, processFile]);

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
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center border border-white/15 bg-white text-black">
              <Sparkles className="size-4" aria-hidden="true" />
            </div>
            <h1 className="text-base font-semibold tracking-normal sm:text-lg">Skull Meme Generator</h1>
          </div>
          <label className="flex h-9 items-center gap-2 text-sm text-zinc-300">
            <span>Auto-save</span>
            <input
              className="peer sr-only"
              checked={autoSave}
              type="checkbox"
              onChange={(event) => setAutoSave(event.target.checked)}
            />
            <span className="relative h-6 w-11 border border-white/20 bg-white/10 transition peer-checked:border-[#f0375f] peer-checked:bg-[#f0375f]">
              <span className={`absolute top-1 size-4 bg-white transition ${autoSave ? "left-6" : "left-1"}`} />
            </span>
          </label>
        </header>

        <div className="grid flex-1 items-stretch gap-4 py-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <aside className="flex flex-col gap-4">
            <label
              className={[
                "group grid min-h-48 cursor-pointer place-items-center border border-dashed p-6 text-center transition",
                isDragging ? "border-[#f0375f] bg-[#f0375f]/12" : "border-white/18 bg-white/[0.035] hover:bg-white/[0.06]",
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
                <span className="text-lg font-semibold">Upload image</span>
                <span className="text-sm text-zinc-400">PNG, JPG, WebP, AVIF</span>
              </span>
            </label>

            <div className="border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="impact" className="text-sm font-medium text-zinc-200">
                  Impact
                </label>
                <span className="font-mono text-sm text-[#76f1ec]">{impact}</span>
              </div>
              <input
                id="impact"
                className="mt-4 h-2 w-full accent-[#f0375f]"
                min="35"
                max="100"
                type="range"
                value={impact}
                onChange={(event) => setImpact(Number(event.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex h-12 items-center justify-center gap-2 bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus className="size-4" aria-hidden="true" />
                Pick
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 border border-white/14 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                disabled={!file || status === "rendering"}
                onClick={() => file && void processFile(file, false)}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Remix
              </button>
            </div>

            <button
              className="flex h-13 items-center justify-center gap-2 bg-[#f0375f] px-5 text-sm font-bold text-white shadow-[0_0_30px_rgba(240,55,95,0.35)] transition hover:bg-[#ff4b70] disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={!ready}
              onClick={download}
            >
              <Download className="size-4" aria-hidden="true" />
              Download PNG
            </button>

            {status === "error" ? (
              <p className="border border-[#f0375f]/40 bg-[#f0375f]/10 p-3 text-sm text-[#ffb8c7]">
                This image could not be processed.
              </p>
            ) : null}
          </aside>

          <div className="grid min-h-[420px] place-items-center overflow-hidden border border-white/10 bg-black">
            <div className="relative grid w-full max-w-[min(100%,78dvh)] place-items-center p-3">
              <div className="absolute inset-3 bg-[radial-gradient(circle_at_center,rgba(240,55,95,0.16),transparent_58%)] blur-2xl" />
              <div className="relative aspect-square w-full overflow-hidden border border-white/10 bg-[#101012]">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="size-full object-cover" src={previewUrl} alt="Generated skull meme" />
                ) : (
                  <div className="grid size-full place-items-center">
                    <div className="grid size-24 place-items-center border border-white/12 text-zinc-500">
                      <UploadCloud className="size-8" aria-hidden="true" />
                    </div>
                  </div>
                )}
                {status === "rendering" ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/72 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">
                    Rendering
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
