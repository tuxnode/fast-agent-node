# @fast-agent/sdk

TypeScript client SDK for `fast-agent-node`.

## Install

```bash
pnpm add @fast-agent/sdk
```

## Usage

```ts
import { FastAgentClient } from "@fast-agent/sdk";

const client = new FastAgentClient({
  baseUrl: "http://localhost:3000"
});
```

## Health

```ts
const health = await client.health();
```

## Inline Completion

```ts
const result = await client.inlineCompletion({
  language: "typescript",
  filePath: "src/math.ts",
  prefix: "export function add(a: number, b: number) {\n  ",
  suffix: "\n}",
  maxTokens: 128
});

console.log(result.completion);
```

The SDK currently supports non-streaming inline completion. Use the HTTP API directly for SSE streaming.

## Form Fill Suggestions

```ts
const result = await client.formFillSuggestions({
  formId: "weekly_report",
  userMessage: "This week I implemented the SDK and CI workflow.",
  fields: [
    {
      name: "summary",
      label: "Work Summary",
      type: "textarea",
      required: true
    },
    {
      name: "nextPlan",
      label: "Next Plan",
      type: "textarea",
      required: true
    }
  ],
  currentValues: {},
  overwrite: false
});

console.log(result.suggestions);
```

This only returns suggestions. It does not submit forms or perform OA write operations.

## Custom Headers

```ts
const client = new FastAgentClient({
  baseUrl: "https://example.com",
  headers: {
    Authorization: "Bearer token"
  }
});
```

## Error Handling

```ts
import { FastAgentClientError } from "@fast-agent/sdk";

try {
  await client.health();
} catch (error) {
  if (error instanceof FastAgentClientError) {
    console.error(error.status, error.code, error.message, error.details);
  }
}
```
