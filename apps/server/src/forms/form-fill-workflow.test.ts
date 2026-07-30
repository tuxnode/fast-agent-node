import { describe, expect, it, vi } from "vitest";

import type { FormFillSuggestionRequest } from "./form-fill.js";
import {
  createFormFillSuggestions,
  type FormFillModelClient
} from "./form-fill-workflow.js";

const baseRequest: FormFillSuggestionRequest = {
  formId: "weekly_report",
  userMessage: "本周完成了补全接口、流式返回和测试。",
  fields: [
    {
      name: "summary",
      label: "工作总结",
      type: "textarea",
      required: true
    },
    {
      name: "risks",
      label: "风险问题",
      type: "textarea",
      required: false
    },
    {
      name: "nextPlan",
      label: "下周计划",
      type: "textarea",
      required: true
    }
  ],
  currentValues: {
    risks: "暂无明显风险。"
  },
  overwrite: false
};

describe("form fill workflow", () => {
  it("preserves existing values by excluding filled fields from suggestions", async () => {
    const modelClient = vi.fn<FormFillModelClient>().mockResolvedValue({
      id: "fill_test",
      model: "deepseek-chat",
      content: JSON.stringify({
        suggestions: {
          summary: "本周完成了接口和测试。",
          risks: "模型试图覆盖已有风险字段。",
          nextPlan: "下周继续完善表单填写能力。"
        },
        missingFields: [],
        warnings: []
      })
    });

    const result = await createFormFillSuggestions(baseRequest, modelClient);

    expect(result).toEqual({
      id: "fill_test",
      suggestions: {
        summary: "本周完成了接口和测试。",
        nextPlan: "下周继续完善表单填写能力。"
      },
      missingFields: [],
      warnings: [],
      model: "deepseek-chat"
    });

    const prompt = modelClient.mock.calls[0]?.[0].messages[1]?.content;

    expect(prompt).toContain('"name": "summary"');
    expect(prompt).not.toContain('"name": "risks"');
    expect(prompt).toContain('"risks": "暂无明显风险。"');
  });

  it("allows filled fields when overwrite is true", async () => {
    const modelClient = vi.fn<FormFillModelClient>().mockResolvedValue({
      id: "fill_overwrite",
      model: "deepseek-chat",
      content: JSON.stringify({
        suggestions: {
          risks: "需要关注上线验证风险。"
        },
        missingFields: [],
        warnings: []
      })
    });

    const result = await createFormFillSuggestions(
      {
        ...baseRequest,
        overwrite: true
      },
      modelClient
    );

    expect(result.suggestions).toEqual({
      risks: "需要关注上线验证风险。"
    });

    const prompt = modelClient.mock.calls[0]?.[0].messages[1]?.content;

    expect(prompt).toContain('"name": "risks"');
  });

  it("filters unknown fields and non-string suggestion values", async () => {
    const modelClient = vi.fn<FormFillModelClient>().mockResolvedValue({
      id: "fill_filter",
      model: "deepseek-chat",
      content: JSON.stringify({
        suggestions: {
          summary: "有效建议。",
          unknownField: "不应该返回。",
          nextPlan: 123
        },
        missingFields: ["nextPlan", 42],
        warnings: ["字段 nextPlan 信息不足", false]
      })
    });

    const result = await createFormFillSuggestions(baseRequest, modelClient);

    expect(result.suggestions).toEqual({
      summary: "有效建议。"
    });
    expect(result.missingFields).toEqual(["nextPlan"]);
    expect(result.warnings).toEqual(["字段 nextPlan 信息不足"]);
  });

  it("parses JSON wrapped in markdown code fences", async () => {
    const modelClient = vi.fn<FormFillModelClient>().mockResolvedValue({
      id: "fill_fence",
      model: "deepseek-chat",
      content: [
        "```json",
        "{",
        '  "suggestions": {',
        '    "summary": "已解析代码块 JSON。"',
        "  },",
        '  "missingFields": [],',
        '  "warnings": []',
        "}",
        "```"
      ].join("\n")
    });

    const result = await createFormFillSuggestions(baseRequest, modelClient);

    expect(result.suggestions).toEqual({
      summary: "已解析代码块 JSON。"
    });
  });

  it("returns a warning when model response is not valid JSON", async () => {
    const modelClient = vi.fn<FormFillModelClient>().mockResolvedValue({
      id: "fill_invalid_json",
      model: "deepseek-chat",
      content: "这里不是 JSON"
    });

    const result = await createFormFillSuggestions(baseRequest, modelClient);

    expect(result).toMatchObject({
      id: "fill_invalid_json",
      suggestions: {},
      missingFields: ["summary", "nextPlan"],
      warnings: ["Model response was not valid JSON"],
      model: "deepseek-chat"
    });
  });

  it("uses context windows for long form fill prompt inputs", async () => {
    const modelClient = vi.fn<FormFillModelClient>().mockResolvedValue({
      id: "fill_context",
      model: "deepseek-chat",
      content: JSON.stringify({
        suggestions: {
          summary: "已根据裁剪后的上下文生成建议。"
        },
        missingFields: [],
        warnings: []
      })
    });
    const longUserMessage = `DROP_USER${"u".repeat(4100)}KEEP_USER`;
    const longDescription = `KEEP_DESCRIPTION${"d".repeat(1100)}DROP_DESCRIPTION`;
    const longCurrentValue = `KEEP_CURRENT${"c".repeat(2100)}DROP_CURRENT`;

    await createFormFillSuggestions(
      {
        ...baseRequest,
        userMessage: longUserMessage,
        fields: [
          {
            name: "summary",
            label: "工作总结",
            type: "textarea",
            required: true,
            description: longDescription
          }
        ],
        currentValues: {
          existing: longCurrentValue
        }
      },
      modelClient
    );

    const prompt = modelClient.mock.calls[0]?.[0].messages[1]?.content ?? "";

    expect(prompt).toContain('"userMessageTruncated": true');
    expect(prompt).toContain(
      `"userMessageOriginalLength": ${longUserMessage.length}`
    );
    expect(prompt).toContain('"summary": true');
    expect(prompt).toContain('"existing": true');
    expect(prompt).toContain("KEEP_USER");
    expect(prompt).toContain("KEEP_DESCRIPTION");
    expect(prompt).toContain("KEEP_CURRENT");
    expect(prompt).not.toContain("DROP_USER");
    expect(prompt).not.toContain("DROP_DESCRIPTION");
    expect(prompt).not.toContain("DROP_CURRENT");
  });
});
