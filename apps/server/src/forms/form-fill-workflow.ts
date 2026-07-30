import {
  type FormField,
  type FormFillSuggestionRequest,
  type FormFillSuggestionResult
} from "./form-fill.js";
import { buildContextWindow } from "../context/context-window.js";
import { validateFormFillSuggestions } from "./form-fill-validation.js";

const FORM_USER_MESSAGE_MAX_CHARS = 4000;
const FORM_FIELD_DESCRIPTION_MAX_CHARS = 1000;
const FORM_CURRENT_VALUE_MAX_CHARS = 2000;

type ModelMessage = {
  role: "system" | "user";
  content: string;
};

export type FormFillModelClient = (input: {
  messages: ModelMessage[];
}) => Promise<{
  id?: string;
  content: string;
  model: string;
}>;

type ModelFormFillResponse = {
  suggestions?: Record<string, unknown>;
  missingFields?: unknown[];
  warnings?: unknown[];
};

export async function createFormFillSuggestions(
  request: FormFillSuggestionRequest,
  modelClient: FormFillModelClient
): Promise<FormFillSuggestionResult> {
  const fillableFields = getFillableFields(request);
  const modelResponse = await modelClient({
    messages: buildFormFillMessages(request, fillableFields)
  });
  const parsedResponse = parseModelResponse(modelResponse.content);
  const validated = validateFormFillSuggestions({
    suggestions: normalizeSuggestions(parsedResponse.suggestions, fillableFields),
    missingFields: normalizeStringArray(parsedResponse.missingFields),
    warnings: normalizeStringArray(parsedResponse.warnings),
    fillableFields
  });

  return {
    id: modelResponse.id ?? `fill_${crypto.randomUUID()}`,
    suggestions: validated.suggestions,
    missingFields: validated.missingFields,
    warnings: validated.warnings,
    model: modelResponse.model
  };
}

function getFillableFields(request: FormFillSuggestionRequest) {
  if (request.overwrite) {
    return request.fields;
  }

  return request.fields.filter((field) => {
    const value = request.currentValues[field.name];

    return value === undefined || value.trim() === "";
  });
}

function buildFormFillMessages(
  request: FormFillSuggestionRequest,
  fillableFields: FormField[]
): ModelMessage[] {
  const context = buildFormFillPromptContext(request, fillableFields);

  return [
    {
      role: "system",
      content:
        "You generate form field suggestions. Return strict JSON only. Do not submit forms or perform actions."
    },
    {
      role: "user",
      content: [
        "Generate suggestions for the fillable fields.",
        "Only use field names listed in fillableFields.",
        "Return JSON with suggestions, missingFields, and warnings.",
        "",
        `formId: ${request.formId}`,
        "contextMetadata:",
        JSON.stringify(context.metadata, null, 2),
        "",
        "userMessage:",
        context.userMessage,
        "",
        "fillableFields:",
        JSON.stringify(context.fillableFields, null, 2),
        "",
        "currentValues:",
        JSON.stringify(context.currentValues, null, 2)
      ].join("\n")
    }
  ];
}

function buildFormFillPromptContext(
  request: FormFillSuggestionRequest,
  fillableFields: FormField[]
) {
  const userMessageWindow = buildContextWindow({
    text: request.userMessage,
    maxChars: FORM_USER_MESSAGE_MAX_CHARS,
    strategy: "tail"
  });
  const fieldDescriptionMetadata: Record<string, boolean> = {};
  const currentValueMetadata: Record<string, boolean> = {};

  const normalizedFields = fillableFields.map((field) => {
    if (!field.description) {
      return field;
    }

    const descriptionWindow = buildContextWindow({
      text: field.description,
      maxChars: FORM_FIELD_DESCRIPTION_MAX_CHARS,
      strategy: "head"
    });
    fieldDescriptionMetadata[field.name] = descriptionWindow.truncated;

    return {
      ...field,
      description: descriptionWindow.text
    };
  });

  const normalizedCurrentValues = Object.fromEntries(
    Object.entries(request.currentValues).map(([name, value]) => {
      const valueWindow = buildContextWindow({
        text: value,
        maxChars: FORM_CURRENT_VALUE_MAX_CHARS,
        strategy: "head"
      });
      currentValueMetadata[name] = valueWindow.truncated;

      return [name, valueWindow.text];
    })
  );

  return {
    userMessage: userMessageWindow.text,
    fillableFields: normalizedFields,
    currentValues: normalizedCurrentValues,
    metadata: {
      userMessageTruncated: userMessageWindow.truncated,
      userMessageOriginalLength: userMessageWindow.originalLength,
      fieldDescriptionTruncated: fieldDescriptionMetadata,
      currentValueTruncated: currentValueMetadata
    }
  };
}

function parseModelResponse(content: string): ModelFormFillResponse {
  try {
    const parsed = JSON.parse(stripJsonCodeFence(content)) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed as ModelFormFillResponse;
  } catch {
    return {
      warnings: ["Model response was not valid JSON"]
    };
  }
}

function normalizeSuggestions(
  suggestions: Record<string, unknown> | undefined,
  fillableFields: FormField[]
) {
  const allowedNames = new Set(fillableFields.map((field) => field.name));
  const normalized: Record<string, string> = {};

  if (!suggestions) {
    return normalized;
  }

  for (const [name, value] of Object.entries(suggestions)) {
    if (allowedNames.has(name) && typeof value === "string") {
      normalized[name] = value;
    }
  }

  return normalized;
}

function normalizeStringArray(value: unknown[] | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function stripJsonCodeFence(content: string) {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}
