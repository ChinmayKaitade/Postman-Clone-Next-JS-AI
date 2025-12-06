# Postman Clone (Next.js + AI UI)

Lightweight Postman-style client built with Next.js 16, React 19, Tailwind CSS v4, Radix UI, and shadcn components.

## Features
- Request builder: HTTP method, URL, query params editor, headers, body, and auth helpers (Bearer/Basic) with auto JSON `Content-Type`.
- Response view: status, time, size, content-type, body/headers tabs with pretty/raw toggle and copy helpers.
- Environments & variables: multiple envs stored locally; reference with `{{KEY}}` in URL, headers, body, and auth.
- Collections: save/load named requests and recall them later.
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
- History stays on this device; use the "Clear" button in the UI to wipe it. Saved requests/environments are also stored locally.
- Streaming/SSE responses are shown as plain text in the body viewer.
- Lint: `npm run lint`
