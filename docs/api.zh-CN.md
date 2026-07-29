# API 文档

本文档描述 `fast-agent-node` 当前已实现的 HTTP API。服务默认监听 `.env` 中的 `HOST` 和 `PORT`，本地示例使用 `http://localhost:3000`。

## 健康检查

```http
GET /health
```

用于确认服务是否启动。

### 响应示例

```json
{
  "status": "ok",
  "service": "fast-agent-node",
  "modelProvider": "openai-compatible",
  "modelName": "deepseek-chat"
}
```

## 行内代码补全

```http
POST /v1/completions/inline
Content-Type: application/json
```

根据光标前后的代码上下文生成插入内容。当前支持普通 JSON 响应和 SSE 流式响应。

### 请求体

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

字段说明：

- `language`: 代码语言。
- `filePath`: 当前文件路径。
- `prefix`: 光标前的代码。
- `suffix`: 光标后的代码。
- `maxTokens`: 可选，本次补全最大 token 数。
- `stream`: 可选，`false` 返回 JSON，`true` 返回 SSE。

### 非流式响应

```json
{
  "id": "chatcmpl_123",
  "completion": "return a + b;",
  "finishReason": "stop",
  "model": "deepseek-chat"
}
```

### 非流式调用示例

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

## 流式补全

当 `stream` 为 `true` 时，接口返回 `text/event-stream`。

### SSE 响应片段

```text
data: {"delta":"return "}

data: {"delta":"a + b;","finishReason":"stop"}

data: [DONE]
```

### 流式调用示例

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

## 错误响应

所有错误响应使用统一结构。

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

错误码：

- `INVALID_REQUEST`: 请求体校验失败。
- `MODEL_PROVIDER_ERROR`: 模型服务请求失败、超时或响应异常。
- `INTERNAL_ERROR`: 服务内部错误。
