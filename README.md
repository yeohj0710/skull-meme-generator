# Skull Meme Generator

A tiny Next.js app that turns an uploaded image into a skull emoji meme PNG.

Developed by yeohj0710.

## What it does

- Processes images entirely in the browser with Canvas.
- Keeps user uploads off the server.
- Preserves the uploaded image aspect ratio.
- Includes adjustable monochrome, noise, and skull size controls.
- Attempts auto-download after upload, with a manual download button as backup.
- Deploys as a static Next.js route on Vercel.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run build
```
