import { describe, expect, it, vi } from "vitest";

import {
  createOpenAICompatibleProvider,
  OpenAICompatibleProviderError
} from "./openai-compatible.js";
import type { InlineCompletionRequest } from "../completions/inline-completion.js";

const providerConfig = {
  MODEL_API_KEY: "test-api-key",
  MODEL_BASE_URL: "https://api.example.com/v1/",
  MODEL_NAME: "deepseek-chat",
  MAX_COMPLETION_TOKENS: 128,
  REQUEST_TIMEOUT_MS: 10
};

const completionRequest: InlineCompletionRequest = {
  language: "typescript",
  filePath: "src/math.ts",
  prefix: "export function add(a: number, b: number) {\n  ",
  suffix: "\n}",
  maxTokens: 64,
  stream: false
};

describe("openai-compatible provider", () => {
  it("requests chat completions and maps successful responses", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chatcmpl_test",
          model: "deepseek-chat",
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: "return a + b;"
              }
            }
          ]
        }),
        {
          status: 200
        }
      )
    );
    const provider = createOpenAICompatibleProvider(providerConfig, fetchImpl);

    const result = await provider(completionRequest);

    expect(result).toEqual({
      id: "chatcmpl_test",
      completion: "return a + b;",
      finishReason: "stop",
      model: "deepseek-chat"
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json"
        }
      })
    );

    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));

    expect(body).toMatchObject({
      model: "deepseek-chat",
      max_tokens: 64,
      stream: false,
      temperature: 0.2
    });
    expect(body.messages[1].content).toContain("Language: typescript");
    expect(body.messages[1].content).toContain(completionRequest.prefix);
    expect(body.messages[1].content).toContain(completionRequest.suffix);
  });

  it("uses default max completion tokens when request omits maxTokens", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: "return a + b;"
              }
            }
          ]
        })
      )
    );
    const provider = createOpenAICompatibleProvider(providerConfig, fetchImpl);

    await provider({
      ...completionRequest,
      maxTokens: undefined
    });

    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));

    expect(body.max_tokens).toBe(128);
  });

  it("throws 500 when API key is missing", async () => {
    const provider = createOpenAICompatibleProvider({
      ...providerConfig,
      MODEL_API_KEY: ""
    });

    await expect(provider(completionRequest)).rejects.toMatchObject({
      statusCode: 500,
      message: "MODEL_API_KEY is required for openai-compatible provider"
    });
  });

  it("maps non-2xx upstream responses to 502", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status: 429 }));
    const provider = createOpenAICompatibleProvider(providerConfig, fetchImpl);

    await expect(provider(completionRequest)).rejects.toMatchObject({
      statusCode: 502,
      message: "Model provider request failed with status 429"
    });
  });

  it("maps missing choices to 502", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ choices: [] })));
    const provider = createOpenAICompatibleProvider(providerConfig, fetchImpl);

    await expect(provider(completionRequest)).rejects.toMatchObject({
      statusCode: 502,
      message: "Model provider response did not include choices"
    });
  });

  it("maps missing completion content to 502", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {}
            }
          ]
        })
      )
    );
    const provider = createOpenAICompatibleProvider(providerConfig, fetchImpl);

    await expect(provider(completionRequest)).rejects.toMatchObject({
      statusCode: 502,
      message: "Model provider response did not include a completion"
    });
  });

  it("maps abort errors to 504", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(abortError);
    const provider = createOpenAICompatibleProvider(providerConfig, fetchImpl);

    await expect(provider(completionRequest)).rejects.toMatchObject({
      statusCode: 504,
      message: "Model provider request timed out"
    });
  });

  it("uses the provider error class for mapped failures", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status: 500 }));
    const provider = createOpenAICompatibleProvider(providerConfig, fetchImpl);

    await expect(provider(completionRequest)).rejects.toBeInstanceOf(
      OpenAICompatibleProviderError
    );
  });
});
