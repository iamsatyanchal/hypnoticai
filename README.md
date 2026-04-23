# NoteForge

A browser-based study tool inspired by NotebookLM. Upload documents or write notes, then ask questions against your content using retrieval-augmented generation (RAG). Supports multiple AI model backends.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS (loaded from CDN)
- pdf.js 4 (loaded from CDN) for client-side PDF parsing
- KaTeX for math rendering
- framer-motion, lucide-react, react-markdown

## Setup

**Prerequisites:** Node.js 18 or later.

```bash
npm install
npm run dev
```

The development server starts at `http://localhost:5173`.

To create a production build:

```bash
npm run build
npm run preview
```

## Usage

1. Open the app in a browser.
2. Upload one or more documents (PDF, TXT, or MD) using the sidebar, or type a note directly into the note input area.
3. Open **Model Settings** (gear icon) and select a model provider. Paste the corresponding API key into the key field.
4. Type a question in the chat input. The app retrieves relevant chunks from your documents, sends them as context to the selected model, and returns an answer with source citations.

### Supported source types

| Type | How to add |
|---|---|
| PDF | File upload |
| Plain text / Markdown | File upload |
| Manual note | Inline note editor |
| YouTube transcript | YouTube URL input |
| Web page | URL input (Gemini provider only) |

### Quick Quiz

The Quick Quiz panel generates practice questions from your uploaded content without requiring a chat interaction.

## Configuration

All configuration is done through the **Model Settings** modal in the UI. No environment variables or `.env` file are required.

### Model providers

| Provider key | Model | API key required |
|---|---|---|
| Qwen | `openai/gpt-oss-120b` | OpenRouter API key |
| Gemma | `gemma-4-31b-it` | Google AI Studio API key |
| Gemini Flash Lite | `gemini-flash-lite-latest` | Google AI Studio API key |

Each provider key is stored only in browser memory for the duration of the session and is never persisted or sent anywhere other than the respective model API endpoint.

### RAG behavior

- Documents are split into chunks of up to 420 characters at sentence boundaries.
- At query time, chunks are scored by keyword overlap against the question, then diversified across source documents (up to 8 chunks, at most a few per document).
- If no lexical match is found, the top chunks from each document are used as fallback context.
- The Gemma provider also sends the raw file bytes (`inlineData`) alongside the chunk context.
- The Gemini provider supports `urlContext` and `webSearch` for web-sourced answers.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint across all source files |
