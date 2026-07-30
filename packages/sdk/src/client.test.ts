import { describe, expect, it, vi } from "vitest";

import { FastAgentClient, FastAgentClientError } from "./client.js";

describe("FastAgentClient", () => {
  it("requests health status", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        status: "ok",
        service: "fast-agent-node",
        modelProvider: "openai-compatible",
        modelName: "deepseek-chat"
      })
    );
    const client = new FastAgentClient({
      baseUrl: "http://localhost:3000/",
      fetch: fetchImpl
    });

    const result = await client.health();

    expect(result).toEqual({
      status: "ok",
      service: "fast-agent-node",
      modelProvider: "openai-compatible",
      modelName: "deepseek-chat"
    });
    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:3000/health", {
      method: "GET",
      headers: {}
    });
  });

  it("requests non-streaming inline completions", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: "cmpl_test",
        completion: "return a + b;",
        finishReason: "stop",
        model: "deepseek-chat"
      })
    );
    const client = new FastAgentClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchImpl,
      headers: {
        "X-Test": "yes"
      }
    });

    const result = await client.inlineCompletion({
      language: "typescript",
      filePath: "src/math.ts",
      prefix: "export function add(a: number, b: number) {\n  ",
      suffix: "\n}",
      maxTokens: 64
    });

    expect(result.completion).toBe("return a + b;");

    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));

    expect(init).toMatchObject({
      method: "POST",
      headers: {
        "X-Test": "yes",
        "Content-Type": "application/json"
      }
    });
    expect(body).toMatchObject({
      language: "typescript",
      stream: false
    });
  });

  it("requests form fill suggestions", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: "fill_test",
        suggestions: {
          summary: "完成 SDK。"
        },
        missingFields: [],
        warnings: [],
        model: "deepseek-chat"
      })
    );
    const client = new FastAgentClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchImpl
    });

    const result = await client.formFillSuggestions({
      formId: "weekly_report",
      userMessage: "本周完成 SDK。",
      fields: [
        {
          name: "summary",
          label: "工作总结",
          type: "textarea",
          required: true
        }
      ]
    });

    expect(result.suggestions).toEqual({
      summary: "完成 SDK。"
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/v1/forms/fill-suggestions",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("throws structured client errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid request",
            details: {
              formId: ["Required"]
            }
          }
        },
        400
      )
    );
    const client = new FastAgentClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchImpl
    });

    await expect(client.health()).rejects.toMatchObject({
      name: "FastAgentClientError",
      status: 400,
      code: "INVALID_REQUEST",
      message: "Invalid request",
      details: {
        formId: ["Required"]
      }
    });
  });

  it("throws fallback client errors for invalid error bodies", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not json", { status: 500 }));
    const client = new FastAgentClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchImpl
    });

    await expect(client.health()).rejects.toBeInstanceOf(FastAgentClientError);
    await expect(client.health()).rejects.toMatchObject({
      status: 500,
      message: "FastAgent request failed with status 500"
    });
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
