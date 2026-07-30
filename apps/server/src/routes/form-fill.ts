import type { FastifyPluginAsync } from "fastify";

import { formFillSuggestionRequestSchema } from "../forms/form-fill.js";
import {
  createFormFillSuggestions,
  type FormFillModelClient
} from "../forms/form-fill-workflow.js";
import { errorResponse } from "../http/errors.js";
import { OpenAICompatibleProviderError } from "../providers/openai-compatible.js";

export function createFormFillRoutes(
  modelClient: FormFillModelClient
): FastifyPluginAsync {
  return async (app) => {
    app.post("/v1/forms/fill-suggestions", async (request, reply) => {
      const parsedBody = formFillSuggestionRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send(
          errorResponse(
            "INVALID_REQUEST",
            "Invalid form fill suggestion request",
            parsedBody.error.flatten().fieldErrors
          )
        );
      }

      try {
        return await createFormFillSuggestions(parsedBody.data, modelClient);
      } catch (error) {
        if (error instanceof OpenAICompatibleProviderError) {
          request.log.error(error);

          return reply
            .code(error.statusCode)
            .send(errorResponse("MODEL_PROVIDER_ERROR", error.message));
        }

        request.log.error(error);

        return reply
          .code(500)
          .send(
            errorResponse("INTERNAL_ERROR", "Form fill suggestion failed")
          );
      }
    });
  };
}
