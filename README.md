# Skull Meme Generator

업로드한 이미지를 해골 이모지 밈 PNG로 만들어주는 작은 Next.js 앱입니다.

Developed by yeohj0710.

## 기능

- 이미지를 서버로 업로드하지 않고 브라우저 Canvas에서 처리합니다.
- 원본 이미지 비율을 유지합니다.
- 흑백 정도, 노이즈 정도, 해골 크기를 조절할 수 있습니다.
- `PNG 다운로드` 버튼을 눌렀을 때만 저장합니다.
- Vercel에서 정적 Next.js 라우트로 배포됩니다.

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 확인

```bash
npm run lint
npm run build
```
