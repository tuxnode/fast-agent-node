import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = await buildApp();

const close = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, "shutting down server");
  await app.close();
};

process.once("SIGINT", (signal) => {
  void close(signal).then(() => process.exit(0));
});

process.once("SIGTERM", (signal) => {
  void close(signal).then(() => process.exit(0));
});

try {
  await app.listen({
    host: config.HOST,
    port: config.PORT
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
