# API Documentation

This document describes the HTTP APIs currently implemented by `fast-agent-node`. The service listens on `HOST` and `PORT` from `.env`; local examples use `http://localhost:3000`.

## Health Check

```http
GET /health
```

Use this endpoint to verify that the service is running.

### Response Example

```json
{
  "status": "ok",
  "service": "fast-agent-node",
  "modelProvider": "openai-compatible",
  "modelName": "deepseek-chat"
}
```

## Inline Code Completion

```http
POST /v1/completions/inline
Content-Type: application/json
```

Generates code to insert between the cursor prefix and suffix. The endpoint supports regular JSON responses and SSE streaming responses.

### Request Body

```json
{
  "language": "typescript",
  "filePath": "src/math.ts",
  "prefix": "export function add(a: number, b: number) {\n  ",
  "suffix": "\n}",
  "maxTokens": 128,
  "stream": false
}
```

Fields:

- `language`: Code language.
- `filePath`: Current file path.
- `prefix`: Code before the cursor.
- `suffix`: Code after the cursor.
- `maxTokens`: Optional maximum token count for this completion.
- `stream`: Optional. `false` returns JSON; `true` returns SSE.

### Non-Streaming Response

```json
{
  "id": "chatcmpl_123",
  "completion": "return a + b;",
  "finishReason": "stop",
  "model": "deepseek-chat"
}
```

### Non-Streaming Example

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

## Streaming Completion

When `stream` is `true`, the endpoint returns `text/event-stream`.

### SSE Chunks

```text
data: {"delta":"return "}

data: {"delta":"a + b;","finishReason":"stop"}

data: [DONE]
```

### Streaming Example

```bash
curl -N -X POST http://localhost:3000/v1/completions/inline \
  -H "Content-Type: application/json" \
  -d '{
    "language": "typescript",
    "filePath": "src/math.ts",
    "prefix": "export function add(a: number, b: number) {\n  ",
    "suffix": "\n}",
    "maxTokens": 128,
    "stream": true
  }'
```

## Error Responses

All error responses use a common structure.

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid inline completion request",
    "details": {
      "language": ["String must contain at least 1 character(s)"]
    }
  }
}
```

Error codes:

- `INVALID_REQUEST`: Request body validation failed.
- `MODEL_PROVIDER_ERROR`: Model provider request failed, timed out, or returned an invalid response.
- `INTERNAL_ERROR`: Internal service error.
