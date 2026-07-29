import Fastify from "fastify";

import type { InlineCompletionProvider } from "./completions/inline-completion.js";
import { config } from "./config.js";
import { createInlineCompletion } from "./providers/openai-compatible.js";
import { createInlineCompletionRoutes } from "./routes/inline-completion.js";

type BuildAppOptions = {
  inlineCompletionProvider?: InlineCompletionProvider;
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
      options.inlineCompletionProvider ?? createInlineCompletion
    )
  );

  return app;
}
