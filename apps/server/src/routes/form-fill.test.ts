import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../app.js";
import type { FormFillModelClient } from "../forms/form-fill-workflow.js";
import { OpenAICompatibleProviderError } from "../providers/openai-compatible.js";

describe("form fill routes", () => {
  it("returns form fill suggestions", async () => {
    const modelClient = vi.fn<FormFillModelClient>().mockResolvedValue({
      id: "chatcmpl_form",
      model: "deepseek-chat",
      content: JSON.stringify({
        suggestions: {
          summary: "本周完成了接口和测试。",
          nextPlan: "下周完善表单填写路由。"
        },
        missingFields: [],
        warnings: []
      })
    });
    const app = await buildApp({
      formFillModelClient: modelClient,
      logger: false
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/forms/fill-suggestions",
        payload: {
          formId: "weekly_report",
          userMessage: "本周完成了接口和测试。",
          fields: [
            {
              name: "summary",
              label: "工作总结",
              type: "textarea",
              required: true
            },
            {
              name: "nextPlan",
              label: "下周计划",
              type: "textarea",
              required: true
            }
          ]
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: "chatcmpl_form",
        suggestions: {
          summary: "本周完成了接口和测试。",
          nextPlan: "下周完善表单填写路由。"
        },
        missingFields: [],
        warnings: [],
        model: "deepseek-chat"
      });
      expect(modelClient).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });

  it("rejects invalid form fill requests", async () => {
    const modelClient = vi.fn<FormFillModelClient>();
    const app = await buildApp({
      formFillModelClient: modelClient,
      logger: false
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/forms/fill-suggestions",
        payload: {
          formId: "",
          userMessage: "",
          fields: []
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid form fill suggestion request",
          details: {
            formId: expect.any(Array),
            userMessage: expect.any(Array),
            fields: expect.any(Array)
          }
        }
      });
      expect(modelClient).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("maps model provider errors to HTTP responses", async () => {
    const modelClient = vi
      .fn<FormFillModelClient>()
      .mockRejectedValue(new OpenAICompatibleProviderError("upstream failed"));
    const app = await buildApp({
      formFillModelClient: modelClient,
      logger: false
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/forms/fill-suggestions",
        payload: {
          formId: "weekly_report",
          userMessage: "帮我写周报。",
          fields: [
            {
              name: "summary",
              label: "工作总结",
              type: "textarea",
              required: true
            }
          ]
        }
      });

      expect(response.statusCode).toBe(502);
      expect(response.json()).toEqual({
        error: {
          code: "MODEL_PROVIDER_ERROR",
          message: "upstream failed"
        }
      });
    } finally {
      await app.close();
    }
  });
});
