import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "./app.js";
import type {
  InlineCompletionProvider,
  InlineCompletionStreamProvider
} from "./completions/inline-completion.js";
import { OpenAICompatibleProviderError } from "./providers/openai-compatible.js";

describe("server routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns health status", async () => {
    const app = await buildApp({
      logger: false
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/health"
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: "ok",
        service: "fast-agent-node"
      });
    } finally {
      await app.close();
    }
  });

  it("rejects invalid inline completion requests", async () => {
    const provider = vi.fn<InlineCompletionProvider>();
    const app = await buildApp({
      inlineCompletionProvider: provider,
      logger: false
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/completions/inline",
        payload: {
          language: "",
          filePath: "src/math.ts",
          prefix: "export function add() {",
          suffix: "}"
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid inline completion request",
          details: {
            language: expect.any(Array)
          }
        }
      });
      expect(provider).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("returns inline completion results from the provider", async () => {
    const provider = vi.fn<InlineCompletionProvider>().mockResolvedValue({
      id: "cmpl_test",
      completion: "return a + b;",
      finishReason: "stop",
      model: "deepseek-chat"
    });
    const app = await buildApp({
      inlineCompletionProvider: provider,
      logger: false
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/completions/inline",
        payload: {
          language: "typescript",
          filePath: "src/math.ts",
          prefix: "export function add(a: number, b: number) {\n  ",
          suffix: "\n}",
          maxTokens: 64,
          stream: false
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: "cmpl_test",
        completion: "return a + b;",
        finishReason: "stop",
        model: "deepseek-chat"
      });
      expect(provider).toHaveBeenCalledWith({
        language: "typescript",
        filePath: "src/math.ts",
        prefix: "export function add(a: number, b: number) {\n  ",
        suffix: "\n}",
        maxTokens: 64,
        stream: false
      });
    } finally {
      await app.close();
    }
  });

  it("maps provider errors to HTTP responses", async () => {
    const provider = vi
      .fn<InlineCompletionProvider>()
      .mockRejectedValue(new OpenAICompatibleProviderError("upstream failed"));
    const app = await buildApp({
      inlineCompletionProvider: provider,
      logger: false
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/completions/inline",
        payload: {
          language: "typescript",
          filePath: "src/math.ts",
          prefix: "export function add(a: number, b: number) {\n  ",
          suffix: "\n}"
        }
      });

      expect(response.statusCode).toBe(502);
      expect(response.json()).toEqual({
        error: {
          code: "MODEL_PROVIDER_ERROR",
          message: "upstream failed"
        }
      });
    } finally {
      await app.close();
    }
  });

  it("streams inline completion chunks when requested", async () => {
    async function* streamProvider() {
      yield {
        delta: "return "
      };
      yield {
        delta: "a + b;",
        finishReason: "stop"
      };
    }

    const provider = vi.fn<InlineCompletionProvider>();
    const app = await buildApp({
      inlineCompletionProvider: provider,
      inlineCompletionStreamProvider:
        streamProvider as InlineCompletionStreamProvider,
      logger: false
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/completions/inline",
        payload: {
          language: "typescript",
          filePath: "src/math.ts",
          prefix: "export function add(a: number, b: number) {\n  ",
          suffix: "\n}",
          maxTokens: 64,
          stream: true
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/event-stream");
      expect(response.body).toContain('data: {"delta":"return "}');
      expect(response.body).toContain(
        'data: {"delta":"a + b;","finishReason":"stop"}'
      );
      expect(response.body).toContain("data: [DONE]");
      expect(provider).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
