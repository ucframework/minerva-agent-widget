# Minerva AI Agent — integration guide

A lightweight, embeddable AI chat widget for UC Pages websites. It renders a
floating action button (FAB) in the bottom-right corner that opens a chat
panel backed by the Minerva RAG backend.

No build step, no dependencies — two static files:

- `minerva-ai-agent.js`
- `minerva-ai-agent.css`

## Quick start (static page)

Host both files in the **same directory** (the script locates its stylesheet
relative to its own `src`), then add to your page:

```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My page</title>
</head>
<body>
  <!-- your page content -->

  <script src="https://example.uc.pt/assets/minerva-ai-agent.js"></script>
  <script>
    window.minervaAgent.init({
      primaryColor: "#20A495",
    });
  </script>
</body>
</html>
```

That's it. The widget injects itself into `document.body`, loads its own CSS
into a shadow root (so your page styles and the widget styles never clash),
and talks to the default backend.

> A `<link rel="stylesheet" href="minerva-ai-agent.css">` tag on the page is
> **not required** — the widget loads the stylesheet itself from the folder
> the script was loaded from. Adding the link tag anyway is harmless.

## Configuration

### `init(options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `primaryColor` | string | `#20A495` | Brand color (6-digit hex) used for the FAB, user bubbles, and accents. The hover shade is derived automatically. |
| `apiUrl` | string | `https://uc-vortex.dev.ucframework.pt` | Backend base URL — absolute, or a same-origin path (e.g. `/minerva-api`) when the host site reverse-proxies the API verbatim. See resolution order below. |
| `domain` | string | *(asks the user)* | Knowledge domain: `"sgrh"` or `"sga"`. When omitted, the widget shows a service picker on first open (options fetched from `/api/get_configs`) and remembers the choice on the device for 24 h. |
| `provider` | string | `"iaedu"` | LLM the backend uses: `"iaedu"` or `"ollama"`. |
| `search` | string | `"dense"` | Retrieval strategy: `"dense"` (vector embeddings — slower, more precise), `"sparse"` (BM25 keywords — faster) or `"hybrid"` (fusion of both). |

```js
window.minervaAgent.init({
  primaryColor: "#003366",
  apiUrl: "/minerva-api",   // optional
  domain: "sgrh",           // optional — omit to let the user choose
  provider: "iaedu",        // optional
  search: "dense",          // optional
});
```

`init()` returns the widget instance; calling it again replaces any existing
widget.

### API base URL resolution

The widget picks the backend endpoint in this order — first one set wins:

1. `init({ apiUrl })` — explicit per-page override.
2. `process.env.API_URL` — replaced at build time when bundling with esbuild
   and a `.env.local` / `.env.development` / `.env.production` file (only
   applies to built bundles).
3. `window.MINERVA_API_URL` — a global set **before** loading the script;
   useful when you can't change the init call.
4. Fallback: `https://uc-vortex.dev.ucframework.pt`.

### Language

The UI language is auto-detected from the browser (English browsers get
English, everything else gets Portuguese). Switch at runtime:

```js
window.minervaAgent.setLanguage("en"); // or "pt"
window.minervaAgent.getLanguage();     // "en" | "pt" | null (not mounted)
```

The open panel re-renders immediately; the conversation is preserved.

### Teardown

```js
window.minervaAgent.destroy();
```

## Behavior notes

- **Domain picker** — when `init()` is called without `domain`, the first
  open shows a service picker (SGRH / SGA, listed from
  `/api/get_configs`). The choice is stored in `localStorage` for 24 h; if
  the configs can't be loaded (e.g. VPN down) the picker shows a retry
  button.
- **Consent gate** — before chatting the user must accept an AI-usage
  disclaimer. Acceptance is stored in `localStorage` per domain for
  **24 hours**, matching the conversation persistence window.
- **Welcome message** — opening a fresh conversation creates the backend
  thread immediately and greets the user with the backend's
  `welcome_message`.
- **Conversation persistence** — the thread id and message history are kept
  in `localStorage` for **24 hours from the last activity**, so a page
  reload or a closed tab restores the conversation (rendered instantly,
  without the typing animation). The header's **reset** button wipes the
  stored conversation, starts a fresh backend thread right away, and shows
  its new welcome message.
- **Expired threads** — if the backend no longer knows the stored thread
  (HTTP 404), the widget silently creates a new thread and resends the
  message once.
- **Answer latency** — real answers take 45–90 s (retrieval + LLM). While
  waiting, the typing indicator rotates progress hints ("A pesquisar
  documentos…", …) and shows a **stop** button that aborts the request
  (Esc does the same); there is deliberately no fetch timeout.
- **Keyboard & screen readers** — the panel is a modal dialog
  (`role="dialog"`, focus trapped inside, focus returns to the launcher on
  close). Esc stops a running answer or closes the panel; the launcher
  exposes `aria-expanded`/`aria-haspopup`.
- **Mobile** — below 520 px the panel goes full-screen (`100dvh`, tracking
  the on-screen keyboard and browser chrome), the FAB hides while the chat
  is open (use the header's minimize button to close), and the input uses a
  16 px font so iOS Safari doesn't zoom on focus.

## CORS

In production there is **no intermediary server**: the widget calls the
backend directly, with unmodified requests. That requires the backend's
CORS allowlist to include every origin that embeds the widget.

For **local development only**, a pass-through CORS proxy is bundled (it
forwards requests unchanged and just adds CORS headers):

```bash
node dev-server/proxy-server.js       # listens on http://localhost:8789
```

```js
window.minervaAgent.init({ apiUrl: "http://localhost:8789" });
```

The backend itself is only reachable on the UC VPN (nginx returns
`403 Forbidden` otherwise) — this applies to the dev proxy too, since it
runs on your machine and forwards over your network.

## Local development

```bash
# 1. static server for the demo page (this origin IS CORS-allowlisted)
npx serve src -l 8080
# → http://localhost:8080/demo

# 2. optional: CORS proxy to the real backend, for pages served from
#    an origin that is NOT on the backend's CORS allowlist
node dev-server/proxy-server.js         # http://localhost:8789
# then in the page: window.MINERVA_API_URL = "http://localhost:8789";
```

## Backend API (for reference)

| Endpoint | Method | Body | Returns |
| --- | --- | --- | --- |
| `/api/get_configs` | GET | — | domains, providers, search modes |
| `/api/chat/new` | POST | `{ domain, provider, search }` | `{ thread_id, welcome_message }` |
| `/api/chat/message` | POST | `{ thread_id, message }` | `{ thread_id, answer, retrieved_docs, ... }` |

The widget uses `domain: "sgrh"`, `provider: "iaedu"`, `search: "dense"`
(hardcoded in `_mergeConfig`).
