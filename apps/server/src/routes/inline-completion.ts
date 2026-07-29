import type { FastifyPluginAsync } from "fastify";

import {
  inlineCompletionRequestSchema,
  type InlineCompletionProvider,
  type InlineCompletionStreamProvider
} from "../completions/inline-completion.js";
import {
  OpenAICompatibleProviderError
} from "../providers/openai-compatible.js";

export function createInlineCompletionRoutes(
  provider: InlineCompletionProvider,
  streamProvider: InlineCompletionStreamProvider
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
        if (parsedBody.data.stream) {
          reply
            .header("Content-Type", "text/event-stream; charset=utf-8")
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive");
          reply.raw.setHeader(
            "Content-Type",
            "text/event-stream; charset=utf-8"
          );
          reply.raw.setHeader("Cache-Control", "no-cache");
          reply.raw.setHeader("Connection", "keep-alive");

          for await (const chunk of streamProvider(parsedBody.data)) {
            reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }

          reply.raw.write("data: [DONE]\n\n");
          reply.raw.end();

          return reply;
        }

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
