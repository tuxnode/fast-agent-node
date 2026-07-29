import Fastify from "fastify";

import { config } from "./config.js";
import { inlineCompletionRoutes } from "./routes/inline-completion.js";

export async function buildApp() {
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

  await app.register(inlineCompletionRoutes);

  return app;
}
