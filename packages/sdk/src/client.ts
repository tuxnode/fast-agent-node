import type {
  ErrorResponse,
  FormFillSuggestionRequest,
  FormFillSuggestionResult,
  HealthResponse,
  InlineCompletionRequest,
  InlineCompletionResult
} from "./types.js";

type Fetch = typeof fetch;

export type FastAgentClientOptions = {
  baseUrl: string;
  fetch?: Fetch;
  headers?: Record<string, string>;
};

export class FastAgentClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "FastAgentClientError";
  }
}

export class FastAgentClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: Fetch;
  private readonly headers: Record<string, string> | undefined;

  constructor(options: FastAgentClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? fetch;
    this.headers = options.headers;
  }

  health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health", {
      method: "GET"
    });
  }

  inlineCompletion(
    request: InlineCompletionRequest
  ): Promise<InlineCompletionResult> {
    return this.request<InlineCompletionResult>("/v1/completions/inline", {
      method: "POST",
      body: JSON.stringify({
        ...request,
        stream: false
      })
    });
  }

  formFillSuggestions(
    request: FormFillSuggestionRequest
  ): Promise<FormFillSuggestionResult> {
    return this.request<FormFillSuggestionResult>(
      "/v1/forms/fill-suggestions",
      {
        method: "POST",
        body: JSON.stringify(request)
      }
    );
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...this.headers,
        ...(init.body ? { "Content-Type": "application/json" } : {})
      }
    });

    if (!response.ok) {
      throw await createClientError(response);
    }

    return (await response.json()) as T;
  }
}

async function createClientError(response: Response) {
  const fallbackMessage = `FastAgent request failed with status ${response.status}`;

  try {
    const body = (await response.json()) as Partial<ErrorResponse>;
    const error = body.error;

    if (error?.message) {
      return new FastAgentClientError(
        error.message,
        response.status,
        error.code,
        error.details
      );
    }
  } catch {
    // Ignore invalid error bodies and use the HTTP status fallback.
  }

  return new FastAgentClientError(fallbackMessage, response.status);
}
