"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, RefreshCw, Skull, UploadCloud } from "lucide-react";

type RenderStatus = "idle" | "rendering" | "ready" | "error";

type EffectSettings = {
  mono: number;
  noise: number;
  skull: number;
};

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1620;
const OUTPUT_ASPECT = OUTPUT_WIDTH / OUTPUT_HEIGHT;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const SKULL_SRC = "/emoji-skull.webp";

const T = {
  title: "Skull Meme Generator",
  upload: "\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC",
  mono: "\uD751\uBC31 \uC815\uB3C4",
  noise: "\uB178\uC774\uC988 \uC815\uB3C4",
  skull: "\uD574\uACE8 \uD06C\uAE30",
  pick: "\uC120\uD0DD",
  remix: "\uB2E4\uC2DC \uC11E\uAE30",
  download: "PNG \uB2E4\uC6B4\uB85C\uB4DC",
  processing: "\uC0DD\uC131 \uC911",
  error: "\uC774 \uC774\uBBF8\uC9C0\uB294 \uCC98\uB9AC\uD560 \uC218 \uC5C6\uC5B4\uC694.",
  alt: "\uC0DD\uC131\uB41C \uD574\uACE8 \uBC08",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function getCoverCrop(image: ImageBitmap, width: number, height: number) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (sourceRatio > targetRatio) {
    sw = image.height * targetRatio;
    sx = (image.width - sw) * 0.5;
  } else {
    sh = image.width / targetRatio;
    sy = (image.height - sh) * 0.44;
  }

  return { sx, sy, sw, sh };
}

function drawBasePhoto(ctx: CanvasRenderingContext2D, image: ImageBitmap, width: number, height: number, mono: number) {
  const crop = getCoverCrop(image, width, height);

  ctx.save();
  ctx.filter = [
    `grayscale(${mono * 0.8})`,
    `contrast(${1.0 + mono * 0.18})`,
    `saturate(${0.96 - mono * 0.44})`,
    `brightness(${0.82 - mono * 0.1})`,
  ].join(" ");
  ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number, strength: number) {
  const radius = Math.max(width, height) * 0.72;
  const gradient = ctx.createRadialGradient(width / 2, height * 0.38, 0, width / 2, height / 2, radius);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.55, `rgba(0,0,0,${0.14 + strength * 0.06})`);
  gradient.addColorStop(1, `rgba(0,0,0,${0.48 + strength * 0.16})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = `rgba(0,0,0,${0.04 + strength * 0.08})`;
  ctx.fillRect(0, 0, width, height);
}

function drawNoise(ctx: CanvasRenderingContext2D, width: number, height: number, noise: number) {
  const specks = Math.floor(width * height * (0.002 + noise * 0.011));

  for (let i = 0; i < specks; i += 1) {
    const value = Math.random() > 0.52 ? 255 : 0;
    const alpha = Math.random() * 0.045 + noise * 0.025;
    ctx.fillStyle = `rgba(${value},${value},${value},${alpha})`;
    const size = Math.random() > 0.92 ? 2 : 1;
    ctx.fillRect(Math.random() * width, Math.random() * height, size, size);
  }
}

function drawScanlines(ctx: CanvasRenderingContext2D, width: number, height: number, noise: number) {
  ctx.save();
  ctx.globalAlpha = 0.055 + noise * 0.07;
  ctx.fillStyle = "#050505";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();
}

function drawLightBloom(ctx: CanvasRenderingContext2D, width: number, height: number, noise: number) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const bottom = ctx.createRadialGradient(width * 0.52, height * 0.86, 0, width * 0.52, height * 0.86, width * 0.62);
  bottom.addColorStop(0, `rgba(255,255,255,${0.12 + noise * 0.14})`);
  bottom.addColorStop(0.28, `rgba(175,190,190,${0.08 + noise * 0.08})`);
  bottom.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, width, height);

  const side = ctx.createLinearGradient(0, 0, width, height);
  side.addColorStop(0, `rgba(255,255,255,${0.02 + noise * 0.05})`);
  side.addColorStop(0.46, "rgba(255,255,255,0)");
  side.addColorStop(1, `rgba(255,255,255,${0.03 + noise * 0.04})`);
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawFilmScratches(ctx: CanvasRenderingContext2D, width: number, height: number, noise: number) {
  const scratches = Math.floor(8 + noise * 34);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineCap = "round";

  for (let i = 0; i < scratches; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const length = height * (0.025 + Math.random() * 0.12);
    const lean = (Math.random() - 0.5) * width * 0.035;
    ctx.globalAlpha = 0.04 + Math.random() * (0.08 + noise * 0.12);
    ctx.lineWidth = Math.random() > 0.82 ? 2 : 1;
    ctx.strokeStyle = Math.random() > 0.72 ? "#ffffff" : "#bfc7c7";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y + length);
    ctx.stroke();
  }

  ctx.restore();
}

function drawShakeSlices(ctx: CanvasRenderingContext2D, width: number, height: number, noise: number) {
  const slices = Math.floor(3 + noise * 9);
  ctx.save();
  ctx.globalAlpha = 0.05 + noise * 0.09;
  for (let i = 0; i < slices; i += 1) {
    const sliceHeight = 3 + Math.random() * (height * 0.014);
    const y = Math.random() * height;
    const shift = (Math.random() - 0.5) * (width * (0.01 + noise * 0.02));
    ctx.drawImage(ctx.canvas, 0, y, width, sliceHeight, shift, y, width, sliceHeight);
  }
  ctx.restore();
}

function drawSkullAsset(ctx: CanvasRenderingContext2D, skullImage: HTMLImageElement, width: number, height: number, skull: number) {
  const size = clamp(width * (0.1 + skull * 0.2), 72, width * 0.34);
  const x = width / 2 - size / 2 + (Math.random() - 0.5) * size * 0.05;
  const y = height * 0.78 - size / 2 + (Math.random() - 0.5) * size * 0.05;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.06;
  ctx.drawImage(skullImage, x, y, size, size);
  ctx.restore();
}

async function renderSkullMeme(file: File, canvas: HTMLCanvasElement, skullImage: HTMLImageElement, settings: EffectSettings) {
  const bitmap = await createImageBitmap(file);
  const ctx = canvas.getContext("2d", { alpha: false });

  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas is not available.");
  }

  const width = OUTPUT_WIDTH;
  const height = OUTPUT_HEIGHT;
  const mono = clamp(settings.mono / 100, 0, 1);
  const noise = clamp(settings.noise / 100, 0, 1);
  const skull = clamp(settings.skull / 100, 0.35, 1);
  const atmosphere = clamp((mono + noise) / 2, 0.05, 1);

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, width, height);

  drawBasePhoto(ctx, bitmap, width, height, mono);
  drawShakeSlices(ctx, width, height, noise);
  drawVignette(ctx, width, height, atmosphere);
  drawLightBloom(ctx, width, height, noise);
  drawScanlines(ctx, width, height, noise);
  drawFilmScratches(ctx, width, height, noise);
  drawNoise(ctx, width, height, noise);
  drawSkullAsset(ctx, skullImage, width, height, skull);

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
  const skullImageRef = useRef<HTMLImageElement | null>(null);
  const settingsRef = useRef<EffectSettings>({ mono: 48, noise: 62, skull: 42 });
  const renderIdRef = useRef(0);
  const [status, setStatus] = useState<RenderStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [mono, setMono] = useState(48);
  const [noise, setNoise] = useState(62);
  const [skull, setSkull] = useState(42);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewAspect, setPreviewAspect] = useState(OUTPUT_ASPECT);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    void loadImage(SKULL_SRC).then((image) => {
      skullImageRef.current = image;
    });
  }, []);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !file) {
      return;
    }

    triggerDownload(canvas, file);
  }, [file]);

  const processFile = useCallback(
    async (nextFile: File, nextSettings = settingsRef.current) => {
      const canvas = canvasRef.current;
      const skullImage = skullImageRef.current ?? (await loadImage(SKULL_SRC));
      skullImageRef.current = skullImage;
      const renderId = renderIdRef.current + 1;
      renderIdRef.current = renderId;

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
        await renderSkullMeme(nextFile, canvas, skullImage, nextSettings);
        if (renderId !== renderIdRef.current) {
          return;
        }
        setPreviewUrl(canvas.toDataURL("image/png", 0.95));
        setPreviewAspect(canvas.width / canvas.height);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    },
    [],
  );

  const updateSetting = useCallback(
    (key: keyof EffectSettings, value: number) => {
      const nextSettings = { ...settingsRef.current, [key]: value };
      settingsRef.current = nextSettings;

      if (key === "mono") {
        setMono(value);
      } else if (key === "noise") {
        setNoise(value);
      } else {
        setSkull(value);
      }

      const latestFile = latestFileRef.current;
      if (latestFile) {
        void processFile(latestFile, nextSettings);
      }
    },
    [processFile],
  );

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
  const previewWidth = previewAspect >= 1 ? "min(100%, 860px)" : `min(100%, ${Math.round(previewAspect * 620)}px)`;
  const previewHeight = previewAspect < 1 ? "min(62dvh, 620px)" : "auto";

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#070708] text-zinc-50">
      <section className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center border border-white/15 bg-white text-black">
              <Skull className="size-4" aria-hidden="true" />
            </div>
            <h1 className="truncate text-base font-semibold tracking-normal sm:text-lg">{T.title}</h1>
          </div>
          <span className="shrink-0 font-mono text-sm text-zinc-500">PNG</span>
        </header>

        <div className="flex flex-1 flex-col gap-4 py-4">
          <label
            className={[
              "group relative grid cursor-pointer place-items-center overflow-hidden border border-dashed bg-white/[0.035] text-center transition",
              isDragging ? "border-white bg-white/10" : "border-white/18 hover:bg-white/[0.06]",
            ].join(" ")}
            style={{ aspectRatio: previewAspect, width: previewWidth, height: previewHeight, maxWidth: "100%", alignSelf: "center" }}
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
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="size-full object-contain" src={previewUrl} alt={T.alt} />
            ) : (
              <span className="flex flex-col items-center gap-4 p-6">
                <span className="grid size-14 place-items-center bg-white text-black transition group-hover:scale-105">
                  <UploadCloud className="size-6" aria-hidden="true" />
                </span>
                <span className="text-lg font-semibold">{T.upload}</span>
                <span className="text-sm text-zinc-400">PNG, JPG, WebP, AVIF</span>
              </span>
            )}
            {status === "rendering" ? (
              <div className="absolute inset-0 grid place-items-center bg-black/72 text-sm font-semibold tracking-[0.18em] text-zinc-200">
                {T.processing}
              </div>
            ) : null}
          </label>

          <Control id="mono" label={T.mono} value={mono} min={0} max={100} onChange={(value) => updateSetting("mono", value)} />
          <Control id="noise" label={T.noise} value={noise} min={0} max={100} onChange={(value) => updateSetting("noise", value)} />
          <Control id="skull" label={T.skull} value={skull} min={0} max={100} onChange={(value) => updateSetting("skull", value)} />

          <div className="grid grid-cols-2 gap-3">
            <button
              className="flex h-12 items-center justify-center gap-2 bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="size-4" aria-hidden="true" />
              {T.pick}
            </button>
            <button
              className="flex h-12 items-center justify-center gap-2 border border-white/14 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={!file || status === "rendering"}
              onClick={() => file && void processFile(file)}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {T.remix}
            </button>
          </div>

          <button
            className="flex h-13 items-center justify-center gap-2 bg-white px-5 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={!ready}
            onClick={download}
          >
            <Download className="size-4" aria-hidden="true" />
            {T.download}
          </button>

          {status === "error" ? (
            <p className="border border-white/30 bg-white/10 p-3 text-sm text-zinc-200">{T.error}</p>
          ) : null}

          <p className="pb-2 text-xs text-zinc-500">Developed by yeohj0710.</p>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </section>
    </main>
  );
}

function Control({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-zinc-200">
          {label}
        </label>
        <span className="font-mono text-sm text-zinc-300">{value}</span>
      </div>
      <input
        id={id}
        className="mt-4 h-2 w-full accent-white"
        min={min}
        max={max}
        type="range"
        value={value}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
