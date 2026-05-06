# Skull Meme Generator

A tiny Next.js app that turns an uploaded image into a phonk-style skull meme PNG.

## What it does

- Processes images entirely in the browser with Canvas.
- Keeps user uploads off the server.
- Exports a 1200 x 1200 PNG.
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
