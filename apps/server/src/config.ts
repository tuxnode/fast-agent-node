import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  MODEL_PROVIDER: z
    .enum(["openai-compatible", "ollama"])
    .default("openai-compatible"),
  MODEL_NAME: z.string().min(1),
  MODEL_BASE_URL: z.string().url(),
  MODEL_API_KEY: z.string().optional().default(""),
  MAX_COMPLETION_TOKENS: z.coerce.number().int().positive().default(128),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  ENABLE_STREAMING: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsedEnv.data;

export type AppConfig = typeof config;
