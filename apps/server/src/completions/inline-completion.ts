import { z } from "zod";

export const inlineCompletionRequestSchema = z.object({
  language: z.string().min(1),
  filePath: z.string().min(1),
  prefix: z.string(),
  suffix: z.string(),
  maxTokens: z.number().int().positive().optional(),
  stream: z.boolean().default(false)
});

export type InlineCompletionRequest = z.infer<
  typeof inlineCompletionRequestSchema
>;

export type CompletionResult = {
  id: string;
  completion: string;
  finishReason: string;
  model: string;
};

export type InlineCompletionProvider = (
  request: InlineCompletionRequest
) => Promise<CompletionResult>;
