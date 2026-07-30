import { describe, expect, it } from "vitest";

import type { FormField } from "./form-fill.js";
import { validateFormFillSuggestions } from "./form-fill-validation.js";

const fields: FormField[] = [
  {
    name: "summary",
    label: "工作总结",
    type: "textarea",
    required: true
  },
  {
    name: "status",
    label: "状态",
    type: "select",
    required: true,
    options: ["正常", "有风险"]
  },
  {
    name: "notes",
    label: "备注",
    type: "text",
    required: false
  }
];

describe("form fill validation", () => {
  it("adds required fields without suggestions to missingFields", () => {
    const result = validateFormFillSuggestions({
      suggestions: {
        notes: "可选备注"
      },
      missingFields: [],
      warnings: [],
      fillableFields: fields
    });

    expect(result).toEqual({
      suggestions: {
        notes: "可选备注"
      },
      missingFields: ["summary", "status"],
      warnings: []
    });
  });

  it("removes empty suggestions and warns", () => {
    const result = validateFormFillSuggestions({
      suggestions: {
        summary: "   ",
        status: "正常"
      },
      missingFields: [],
      warnings: [],
      fillableFields: fields
    });

    expect(result).toEqual({
      suggestions: {
        status: "正常"
      },
      missingFields: ["summary"],
      warnings: ['Removed empty suggestion for field "summary".']
    });
  });

  it("removes invalid select options and warns", () => {
    const result = validateFormFillSuggestions({
      suggestions: {
        summary: "本周工作正常。",
        status: "未知状态"
      },
      missingFields: [],
      warnings: ["model warning"],
      fillableFields: fields
    });

    expect(result).toEqual({
      suggestions: {
        summary: "本周工作正常。"
      },
      missingFields: ["status"],
      warnings: [
        "model warning",
        'Removed invalid option "未知状态" for field "status".'
      ]
    });
  });

  it("trims accepted suggestions", () => {
    const result = validateFormFillSuggestions({
      suggestions: {
        summary: "  本周完成接口。  ",
        status: "正常"
      },
      missingFields: [],
      warnings: [],
      fillableFields: fields
    });

    expect(result.suggestions).toEqual({
      summary: "本周完成接口。",
      status: "正常"
    });
  });
});
