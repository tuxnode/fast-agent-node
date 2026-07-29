# fast-agent-node

Lightweight TypeScript backend for AI-assisted completion and content generation.

Current focus:

- Inline code completion
- JSON and SSE streaming responses
- OpenAI-compatible model providers, such as DeepSeek
- Future form-fill suggestions for OA-style large text fields

## Stack

- Node.js 20+
- pnpm 9+
- TypeScript
- Fastify
- Zod
- Vitest

## Project Structure

```text
apps/server              Fastify API service
apps/server/src/routes   HTTP routes
apps/server/src/providers Model provider integrations
apps/server/src/completions Completion schemas and types
apps/server/src/http     Shared HTTP helpers
docs                     API documentation
```

## Setup

Install dependencies:

```bash
pnpm install
```

Create local config:

```bash
cp .env.example .env
```

Example DeepSeek config:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

MODEL_PROVIDER=openai-compatible
MODEL_NAME=deepseek-chat
MODEL_BASE_URL=https://api.deepseek.com
MODEL_API_KEY=your_api_key

MAX_COMPLETION_TOKENS=128
REQUEST_TIMEOUT_MS=30000
ENABLE_STREAMING=true
```

Do not commit real API keys.

## Commands

```bash
pnpm dev
pnpm --filter @fast-agent/server test
pnpm --filter @fast-agent/server typecheck
pnpm build
pnpm format
```

If pnpm version switching is blocked, use local binaries:

```bash
./node_modules/.bin/vitest run apps/server/src/app.test.ts apps/server/src/providers/openai-compatible.test.ts
./node_modules/.bin/tsc -p apps/server/tsconfig.json --noEmit
```

## API

Health check:

```http
GET /health
```

Inline completion:

```http
POST /v1/completions/inline
```

See:

- [中文 API 文档](docs/api.zh-CN.md)
- [English API Docs](docs/api.en.md)

## Example

```bash
curl -X POST http://localhost:3000/v1/completions/inline \
  -H "Content-Type: application/json" \
  -d '{
    "language": "typescript",
    "filePath": "src/math.ts",
    "prefix": "export function add(a: number, b: number) {\n  ",
    "suffix": "\n}",
    "maxTokens": 128,
    "stream": false
  }'
```

For streaming, set `"stream": true` and use `curl -N`.
