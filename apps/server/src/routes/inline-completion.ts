import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import {
  type CompletionResult,
  OpenAICompatibleProviderError
} from "../providers/openai-compatible.js";

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

export type InlineCompletionProvider = (
  request: InlineCompletionRequest
) => Promise<CompletionResult>;

export function createInlineCompletionRoutes(
  provider: InlineCompletionProvider
): FastifyPluginAsync {
  return async (app) => {
  app.post("/v1/completions/inline", async (request, reply) => {
    const parsedBody = inlineCompletionRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({
        error: "Invalid inline completion request",
        details: parsedBody.error.flatten().fieldErrors
      });
    }

    try {
      return await provider(parsedBody.data);
    } catch (error) {
      if (error instanceof OpenAICompatibleProviderError) {
        request.log.error(error);

        return reply.code(error.statusCode).send({
          error: error.message
        });
      }

      request.log.error(error);

      return reply.code(500).send({
        error: "Inline completion failed"
      });
    }
  });
  };
}
