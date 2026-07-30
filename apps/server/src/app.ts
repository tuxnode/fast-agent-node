import Fastify from "fastify";

import type {
  InlineCompletionProvider,
  InlineCompletionStreamProvider
} from "./completions/inline-completion.js";
import { config } from "./config.js";
import type { FormFillModelClient } from "./forms/form-fill-workflow.js";
import { createFormFillModelClient } from "./providers/form-fill-openai-compatible.js";
import {
  createInlineCompletion,
  createInlineCompletionStream
} from "./providers/openai-compatible.js";
import { createFormFillRoutes } from "./routes/form-fill.js";
import { createInlineCompletionRoutes } from "./routes/inline-completion.js";

type BuildAppOptions = {
  inlineCompletionProvider?: InlineCompletionProvider;
  inlineCompletionStreamProvider?: InlineCompletionStreamProvider;
  formFillModelClient?: FormFillModelClient;
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger:
      options.logger ??
      ({
        level: config.NODE_ENV === "development" ? "info" : "warn"
      } as const)
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "fast-agent-node",
    modelProvider: config.MODEL_PROVIDER,
    modelName: config.MODEL_NAME
  }));

  await app.register(
    createInlineCompletionRoutes(
      options.inlineCompletionProvider ?? createInlineCompletion,
      options.inlineCompletionStreamProvider ?? createInlineCompletionStream
    )
  );
  await app.register(
    createFormFillRoutes(
      options.formFillModelClient ?? createFormFillModelClient
    )
  );

  return app;
}
