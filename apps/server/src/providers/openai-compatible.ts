import { config } from "../config.js";
import type { InlineCompletionRequest } from "../routes/inline-completion.js";

type ChatCompletionResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
    };
  }>;
};

export type CompletionResult = {
  id: string;
  completion: string;
  finishReason: string;
  model: string;
};

export class OpenAICompatibleProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502
  ) {
    super(message);
    this.name = "OpenAICompatibleProviderError";
  }
}

export async function createInlineCompletion(
  request: InlineCompletionRequest
): Promise<CompletionResult> {
  if (!config.MODEL_API_KEY) {
    throw new OpenAICompatibleProviderError(
      "MODEL_API_KEY is required for openai-compatible provider",
      500
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, config.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildChatCompletionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.MODEL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.MODEL_NAME,
        messages: [
          {
            role: "system",
            content:
              "You are a code completion engine. Return only the inserted code. Do not include markdown fences or explanations."
          },
          {
            role: "user",
            content: buildInlineCompletionPrompt(request)
          }
        ],
        max_tokens: request.maxTokens ?? config.MAX_COMPLETION_TOKENS,
        stream: false,
        temperature: 0.2
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new OpenAICompatibleProviderError(
        `Model provider request failed with status ${response.status}`,
        502
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const choice = data.choices?.[0];

    if (!choice) {
      throw new OpenAICompatibleProviderError(
        "Model provider response did not include choices",
        502
      );
    }

    const completion = choice.message?.content;

    if (typeof completion !== "string") {
      throw new OpenAICompatibleProviderError(
        "Model provider response did not include a completion",
        502
      );
    }

    return {
      id: data.id ?? `cmpl_${crypto.randomUUID()}`,
      completion,
      finishReason: choice.finish_reason ?? "stop",
      model: data.model ?? config.MODEL_NAME
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

    throw new OpenAICompatibleProviderError("Model provider request failed", 502);
  } finally {
    clearTimeout(timeout);
  }
}

function buildChatCompletionsUrl() {
  return `${config.MODEL_BASE_URL.replace(/\/$/, "")}/chat/completions`;
}

function buildInlineCompletionPrompt(request: InlineCompletionRequest) {
  return [
    "Complete the code at the cursor.",
    "",
    `Language: ${request.language}`,
    `File: ${request.filePath}`,
    "",
    "Prefix:",
    request.prefix,
    "",
    "Suffix:",
    request.suffix,
    "",
    "Return only the code that should be inserted between Prefix and Suffix."
  ].join("\n");
}
