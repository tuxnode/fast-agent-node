import { describe, expect, it, vi } from "vitest";

import { OpenAICompatibleProviderError } from "./openai-compatible.js";
import { createOpenAICompatibleFormFillClient } from "./form-fill-openai-compatible.js";

const providerConfig = {
  MODEL_API_KEY: "test-api-key",
  MODEL_BASE_URL: "https://api.example.com/v1/",
  MODEL_NAME: "deepseek-chat",
  REQUEST_TIMEOUT_MS: 10
};

const modelInput = {
  messages: [
    {
      role: "system" as const,
      content: "Return JSON only."
    },
    {
      role: "user" as const,
      content: "Generate form suggestions."
    }
  ]
};

describe("form-fill openai-compatible provider", () => {
  it("requests JSON chat completions and maps successful responses", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chatcmpl_form",
          model: "deepseek-chat",
          choices: [
            {
              message: {
                content:
                  '{"suggestions":{"summary":"完成接口实现。"},"missingFields":[],"warnings":[]}'
              }
            }
          ]
        })
      )
    );
    const client = createOpenAICompatibleFormFillClient(
      providerConfig,
      fetchImpl
    );

    const result = await client(modelInput);

    expect(result).toEqual({
      id: "chatcmpl_form",
      content:
        '{"suggestions":{"summary":"完成接口实现。"},"missingFields":[],"warnings":[]}',
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
      messages: modelInput.messages,
      response_format: {
        type: "json_object"
      },
      stream: false,
      temperature: 0.2
    });
  });

  it("throws 500 when API key is missing", async () => {
    const client = createOpenAICompatibleFormFillClient({
      ...providerConfig,
      MODEL_API_KEY: ""
    });

    await expect(client(modelInput)).rejects.toMatchObject({
      statusCode: 500,
      message: "MODEL_API_KEY is required for openai-compatible provider"
    });
  });

  it("maps non-2xx upstream responses to 502", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status: 429 }));
    const client = createOpenAICompatibleFormFillClient(
      providerConfig,
      fetchImpl
    );

    await expect(client(modelInput)).rejects.toMatchObject({
      statusCode: 502,
      message: "Model provider request failed with status 429"
    });
  });

  it("maps missing content to 502", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {}
            }
          ]
        })
      )
    );
    const client = createOpenAICompatibleFormFillClient(
      providerConfig,
      fetchImpl
    );

    await expect(client(modelInput)).rejects.toMatchObject({
      statusCode: 502,
      message: "Model provider response did not include form fill content"
    });
  });

  it("maps abort errors to 504", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(abortError);
    const client = createOpenAICompatibleFormFillClient(
      providerConfig,
      fetchImpl
    );

    await expect(client(modelInput)).rejects.toMatchObject({
      statusCode: 504,
      message: "Model provider request timed out"
    });
  });

  it("uses the shared provider error class for mapped failures", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status: 500 }));
    const client = createOpenAICompatibleFormFillClient(
      providerConfig,
      fetchImpl
    );

    await expect(client(modelInput)).rejects.toBeInstanceOf(
      OpenAICompatibleProviderError
    );
  });
});
