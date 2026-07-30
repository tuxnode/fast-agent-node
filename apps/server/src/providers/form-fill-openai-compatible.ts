import { config } from "../config.js";
import type { FormFillModelClient } from "../forms/form-fill-workflow.js";
import { OpenAICompatibleProviderError } from "./openai-compatible.js";

type ModelMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletionResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

type OpenAICompatibleFormFillConfig = {
  MODEL_API_KEY: string;
  MODEL_BASE_URL: string;
  MODEL_NAME: string;
  REQUEST_TIMEOUT_MS: number;
};

type Fetch = typeof fetch;

export function createOpenAICompatibleFormFillClient(
  providerConfig: OpenAICompatibleFormFillConfig = config,
  fetchImpl: Fetch = fetch
): FormFillModelClient {
  return async function formFillModelClient(input) {
    if (!providerConfig.MODEL_API_KEY) {
      throw new OpenAICompatibleProviderError(
        "MODEL_API_KEY is required for openai-compatible provider",
        500
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, providerConfig.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetchImpl(
        buildChatCompletionsUrl(providerConfig),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${providerConfig.MODEL_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: providerConfig.MODEL_NAME,
            messages: buildMessages(input.messages),
            response_format: {
              type: "json_object"
            },
            stream: false,
            temperature: 0.2
          }),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new OpenAICompatibleProviderError(
          `Model provider request failed with status ${response.status}`,
          502
        );
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;

      if (typeof content !== "string") {
        throw new OpenAICompatibleProviderError(
          "Model provider response did not include form fill content",
          502
        );
      }

      return {
        ...(data.id ? { id: data.id } : {}),
        content,
        model: data.model ?? providerConfig.MODEL_NAME
      };
    } catch (error) {
      if (error instanceof OpenAICompatibleProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenAICompatibleProviderError(
          "Model provider request timed out",
          504
        );
      }

      throw new OpenAICompatibleProviderError(
        "Model provider form fill request failed",
        502
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}

export const createFormFillModelClient =
  createOpenAICompatibleFormFillClient();

function buildChatCompletionsUrl(providerConfig: OpenAICompatibleFormFillConfig) {
  return `${providerConfig.MODEL_BASE_URL.replace(/\/$/, "")}/chat/completions`;
}

function buildMessages(messages: ModelMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
}
