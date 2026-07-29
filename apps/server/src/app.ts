import Fastify from "fastify";

import { config } from "./config.js";
import { createInlineCompletion } from "./providers/openai-compatible.js";
import {
  createInlineCompletionRoutes,
  type InlineCompletionProvider
} from "./routes/inline-completion.js";

type BuildAppOptions = {
  inlineCompletionProvider?: InlineCompletionProvider;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "development" ? "info" : "warn"
    }
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
