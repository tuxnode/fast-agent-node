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

## Form Fill Suggestions

```http
POST /v1/forms/fill-suggestions
Content-Type: application/json
```

Generates field suggestions from a user message, form field definitions, and current values. This endpoint only returns suggestions. It does not submit forms or perform OA write operations.

### Request Body

```json
{
  "formId": "weekly_report",
  "userMessage": "This week I implemented the form-fill workflow, provider, and route.",
  "fields": [
    {
      "name": "summary",
      "label": "Work Summary",
      "type": "textarea",
      "required": true
    },
    {
      "name": "nextPlan",
      "label": "Next Plan",
      "type": "textarea",
      "required": true
    }
  ],
  "currentValues": {},
  "overwrite": false
}
```

Fields:

- `formId`: Form identifier.
- `userMessage`: Natural-language description from the user.
- `fields`: List of fillable fields.
- `currentValues`: Optional current field values.
- `overwrite`: Optional. Defaults to `false`, so existing values are preserved.

Supported field types: `text`, `textarea`, `number`, `date`, `select`.

### Validation Rules

- Existing values in `currentValues` are preserved by default.
- Existing fields are regenerated only when `overwrite` is `true`.
- Empty string suggestions are removed and added to `warnings`.
- `select` suggestions must match one of the field `options`.
- Required fields without valid suggestions are added to `missingFields`.
- `suggestions` only contains field names declared in the request.

### Response Example

```json
{
  "id": "chatcmpl_123",
  "suggestions": {
    "summary": "Implemented the first version of form-fill suggestions, including workflow, provider, and route support.",
    "nextPlan": "Next week, validate the live API behavior and improve documentation examples."
  },
  "missingFields": [],
  "warnings": [],
  "model": "deepseek-chat"
}
```

### Example

```bash
curl -X POST http://localhost:3000/v1/forms/fill-suggestions \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "weekly_report",
    "userMessage": "This week I implemented the form-fill workflow, provider, and route. Next week I will validate the live API.",
    "fields": [
      {
        "name": "summary",
        "label": "Work Summary",
        "type": "textarea",
        "required": true
      },
      {
        "name": "nextPlan",
        "label": "Next Plan",
        "type": "textarea",
        "required": true
      }
    ],
    "currentValues": {},
    "overwrite": false
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
