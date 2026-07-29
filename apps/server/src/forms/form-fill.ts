import { z } from "zod";

// Public field contract accepted by the form-fill API. Keep this schema
// provider-agnostic so it can describe fields from different OA systems.
export const formFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "number", "date", "select"]),
  required: z.boolean().default(false),
  description: z.string().optional(),
  options: z.array(z.string()).optional()
});

// The workflow suggests field values only. It does not submit forms or perform
// OA write operations. Existing values are preserved unless overwrite is true.
export const formFillSuggestionRequestSchema = z.object({
  formId: z.string().min(1),
  userMessage: z.string().min(1),
  fields: z.array(formFieldSchema).min(1),
  currentValues: z.record(z.string()).default({}),
  overwrite: z.boolean().default(false)
});

export type FormField = z.infer<typeof formFieldSchema>;

export type FormFillSuggestionRequest = z.infer<
  typeof formFillSuggestionRequestSchema
>;

// suggestions only contains known field names. missingFields and warnings are
// used when the model cannot infer enough information from userMessage.
export type FormFillSuggestionResult = {
  id: string;
  suggestions: Record<string, string>;
  missingFields: string[];
  warnings: string[];
  model: string;
};
