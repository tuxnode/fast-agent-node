import { config } from "../config.js";
import type {
  CompletionStreamChunk,
  CompletionResult,
  InlineCompletionRequest
} from "../completions/inline-completion.js";

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

type ChatCompletionStreamResponse = {
  choices?: Array<{
    finish_reason?: string | null;
    delta?: {
      content?: string | null;
    };
  }>;
};

type OpenAICompatibleProviderConfig = {
  MODEL_API_KEY: string;
  MODEL_BASE_URL: string;
  MODEL_NAME: string;
  MAX_COMPLETION_TOKENS: number;
  REQUEST_TIMEOUT_MS: number;
};

type Fetch = typeof fetch;

export class OpenAICompatibleProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502
  ) {
    super(message);
    this.name = "OpenAICompatibleProviderError";
  }
}

export function createOpenAICompatibleProvider(
  providerConfig: OpenAICompatibleProviderConfig = config,
  fetchImpl: Fetch = fetch
) {
  return async function createCompletion(
    request: InlineCompletionRequest
  ): Promise<CompletionResult> {
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
          body: JSON.stringify(
            buildChatCompletionsBody(request, providerConfig, false)
          ),
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
        "Model provider request failed",
        502
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}

export const createInlineCompletion = createOpenAICompatibleProvider();

export function createOpenAICompatibleStreamProvider(
  providerConfig: OpenAICompatibleProviderConfig = config,
  fetchImpl: Fetch = fetch
) {
  return async function* createCompletionStream(
    request: InlineCompletionRequest
  ): AsyncIterable<CompletionStreamChunk> {
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
          body: JSON.stringify(
            buildChatCompletionsBody(request, providerConfig, true)
          ),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new OpenAICompatibleProviderError(
          `Model provider request failed with status ${response.status}`,
          502
        );
      }

      if (!response.body) {
        throw new OpenAICompatibleProviderError(
          "Model provider response did not include a stream body",
          502
        );
      }

      yield* parseOpenAICompatibleStream(response.body);
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
        "Model provider stream request failed",
        502
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}

export const createInlineCompletionStream =
  createOpenAICompatibleStreamProvider();

function buildChatCompletionsUrl(providerConfig: OpenAICompatibleProviderConfig) {
  return `${providerConfig.MODEL_BASE_URL.replace(/\/$/, "")}/chat/completions`;
}

function buildChatCompletionsBody(
  request: InlineCompletionRequest,
  providerConfig: OpenAICompatibleProviderConfig,
  stream: boolean
) {
  return {
    model: providerConfig.MODEL_NAME,
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
    max_tokens: request.maxTokens ?? providerConfig.MAX_COMPLETION_TOKENS,
    stream,
    temperature: 0.2
  };
}

async function* parseOpenAICompatibleStream(
  body: ReadableStream<Uint8Array>
): AsyncIterable<CompletionStreamChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const chunk = parseStreamLine(line);

        if (chunk) {
          yield chunk;
        }
      }
    }

    buffer += decoder.decode();

    if (buffer) {
      const chunk = parseStreamLine(buffer);

      if (chunk) {
        yield chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseStreamLine(line: string): CompletionStreamChunk | null {
  const trimmedLine = line.trim();

  if (!trimmedLine.startsWith("data:")) {
    return null;
  }

  const payload = trimmedLine.slice("data:".length).trim();

  if (!payload || payload === "[DONE]") {
    return null;
  }

  const data = JSON.parse(payload) as ChatCompletionStreamResponse;
  const choice = data.choices?.[0];

  if (!choice) {
    return null;
  }

  const chunk: CompletionStreamChunk = {
    delta: choice.delta?.content ?? ""
  };

  if (choice.finish_reason) {
    chunk.finishReason = choice.finish_reason;
  }

  return chunk;
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
