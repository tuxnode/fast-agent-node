export type HealthResponse = {
  status: "ok";
  service: string;
  modelProvider: string;
  modelName: string;
};

export type InlineCompletionRequest = {
  language: string;
  filePath: string;
  prefix: string;
  suffix: string;
  maxTokens?: number;
  stream?: false;
};

export type InlineCompletionResult = {
  id: string;
  completion: string;
  finishReason: string;
  model: string;
};

export type FormField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select";
  required?: boolean;
  description?: string;
  options?: string[];
};

export type FormFillSuggestionRequest = {
  formId: string;
  userMessage: string;
  fields: FormField[];
  currentValues?: Record<string, string>;
  overwrite?: boolean;
};

export type FormFillSuggestionResult = {
  id: string;
  suggestions: Record<string, string>;
  missingFields: string[];
  warnings: string[];
  model: string;
};

export type ErrorResponse = {
  error: {
    code: "INVALID_REQUEST" | "MODEL_PROVIDER_ERROR" | "INTERNAL_ERROR";
    message: string;
    details?: unknown;
  };
};
