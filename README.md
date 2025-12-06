# Postman Clone (Next.js + AI UI)

Lightweight Postman-style client built with Next.js 16, React 19, Tailwind CSS v4, Radix UI, and shadcn components.

## Features
- Request builder: HTTP method, URL, headers, body, and auto JSON `Content-Type` when possible.
- Response view: status, time, size, body, and headers tabs.
- Local history: last 25 requests are stored in browser `localStorage`.
- Theme support: light/dark toggle powered by `next-themes`.
- Flexible layout: draggable panels and a modern UI.

## Setup
```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Notes
- CORS is enforced by the browser; if the server blocks it, the response will fail.
- History stays on this device; use the "Clear" button in the UI to wipe it.
- Lint: `npm run lint`
