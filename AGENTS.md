# Repository Guidelines

## Project Structure & Module Organization

This repository is a pnpm workspace for a TypeScript AI code completion backend.

- `apps/server`: Fastify HTTP service and API routes.
- `apps/server/src/routes`: route handlers, such as inline completions.
- `apps/server/src/providers`: model provider integrations, including OpenAI-compatible APIs.
- `packages/*`: planned shared packages for adapters, core logic, SDK, context, and shared utilities.
- `examples/*`: planned integration examples.
- `docs`: project documentation.

Tests currently live beside source files using `*.test.ts`, for example `apps/server/src/app.test.ts`.

## Build, Test, and Development Commands

- `pnpm install`: install workspace dependencies.
- `pnpm dev`: run the server in watch mode through `@fast-agent/server`.
- `pnpm --filter @fast-agent/server test`: run server tests with Vitest.
- `pnpm --filter @fast-agent/server typecheck`: run TypeScript checks for the server.
- `pnpm build`: build all workspace packages that define a build script.
- `pnpm format`: format files with Prettier.

If pnpm version switching is unavailable in a constrained environment, use local binaries directly, for example:

```bash
./node_modules/.bin/vitest run apps/server/src/app.test.ts
./node_modules/.bin/tsc -p apps/server/tsconfig.json --noEmit
```

## Coding Style & Naming Conventions

Use TypeScript with ES modules and `NodeNext` resolution. Prefer small modules with explicit exports. Use two-space indentation in JSON/YAML and standard Prettier formatting for TypeScript.

Use kebab-case for route/provider filenames, such as `inline-completion.ts` and `openai-compatible.ts`. Use camelCase for variables and functions, PascalCase for types and classes.

## Testing Guidelines

Vitest is the test framework. Keep tests close to the code they cover and name them `*.test.ts`. Use Fastify `app.inject()` for route tests instead of opening network ports.

External model calls must be mocked in tests. Inject providers through `buildApp()` rather than calling DeepSeek or other remote APIs directly.

## Commit & Pull Request Guidelines

Git history uses Conventional Commit-style prefixes, including `feat:`, `fix:`, `docs:`, `refactor:`, and `tests:`. Keep commit messages imperative and scoped to one logical change.

Pull requests should include a short summary, test commands run, related issues if any, and API examples for route behavior changes.

## Security & Configuration Tips

Do not commit real API keys. Keep local secrets in `.env`; use `.env.example` for safe defaults. DeepSeek/OpenAI-compatible settings are read from `MODEL_BASE_URL`, `MODEL_API_KEY`, and `MODEL_NAME`.
