# fast-agent-node

Intelligent AI auto completion backend.

`fast-agent-node` is planned as a lightweight AI code completion microservice
that can be integrated into common web backends. The service exposes simple
HTTP/SSE APIs for inline code completion, routes requests to different model
providers, and keeps model/runtime details outside of the host application.

## Tech Stack

- Runtime: Node.js 20+
- Language: TypeScript
- Package manager: pnpm
- HTTP framework: Fastify
- Validation: Zod
- Streaming: Server-Sent Events
- Testing: Vitest
- Linting and formatting: ESLint, Prettier
- Model providers:
  - OpenAI-compatible APIs
  - Ollama
  - vLLM or other OpenAI-compatible self-hosted runtimes

## Environment Requirements

- Node.js 20 or newer
- pnpm 9 or newer
- Optional: Ollama, vLLM, or another local model runtime
- Optional: Docker, if you want to run model services or databases locally

Check your local versions:

```bash
node --version
pnpm --version
```

Install pnpm with Corepack if needed:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Planned Project Structure

```text
fast-agent-node
├── apps
│   └── server
├── packages
│   ├── adapters
│   ├── context
│   ├── core
│   ├── sdk
│   └── shared
├── examples
│   ├── express-backend
│   ├── fastify-backend
│   └── monaco-editor
└── docs
```

## Environment Variables

Create a local environment file:

```bash
cp .env.example .env
```

Recommended variables:

```bash
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Model routing
MODEL_PROVIDER=openai-compatible
MODEL_NAME=qwen2.5-coder
MODEL_BASE_URL=http://localhost:11434/v1
MODEL_API_KEY=

# Completion behavior
MAX_COMPLETION_TOKENS=128
REQUEST_TIMEOUT_MS=30000
ENABLE_STREAMING=true
```

## Setup Commands

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Build the project:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

Run linting:

```bash
pnpm lint
```

Format code:

```bash
pnpm format
```

## Local Model Example

If you use Ollama locally, start a coding model first:

```bash
ollama pull qwen2.5-coder
ollama serve
```

Then configure:

```bash
MODEL_PROVIDER=ollama
MODEL_NAME=qwen2.5-coder
MODEL_BASE_URL=http://localhost:11434
```

## Planned API

Inline completion endpoint:

```http
POST /v1/completions/inline
```

Example request:

```json
{
  "language": "typescript",
  "filePath": "src/service/user.ts",
  "prefix": "async function getUser(id: string) {\n  ",
  "suffix": "\n}",
  "maxTokens": 128,
  "stream": true
}
```

Example response:

```json
{
  "id": "cmpl_123",
  "completion": "const user = await db.user.findUnique({ where: { id } });\n  return user;",
  "finishReason": "stop",
  "model": "qwen2.5-coder"
}
```

## Development Status

This repository is currently in the planning stage. The README documents the
target architecture, framework choices, and setup commands before the service
implementation is added.
