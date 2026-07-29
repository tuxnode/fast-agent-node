import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { config } from "../config.js";

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

export const inlineCompletionRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/completions/inline", async (request, reply) => {
    const parsedBody = inlineCompletionRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({
        error: "Invalid inline completion request",
        details: parsedBody.error.flatten().fieldErrors
      });
    }

    return {
      id: `cmpl_${crypto.randomUUID()}`,
      completion: "",
      finishReason: "stop",
      model: config.MODEL_NAME
    };
  });
};
