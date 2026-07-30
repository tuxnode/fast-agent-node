import { describe, expect, it } from "vitest";

import { buildContextWindow } from "./context-window.js";

describe("context window", () => {
  it("returns full text when it fits within maxChars", () => {
    const result = buildContextWindow({
      text: "short context",
      maxChars: 100,
      strategy: "tail"
    });

    expect(result).toEqual({
      text: "short context",
      strategy: "tail",
      truncated: false,
      originalLength: 13,
      length: 13
    });
  });

  it("keeps the head of long text", () => {
    const result = buildContextWindow({
      text: "abcdefghijklmnopqrstuvwxyz",
      maxChars: 8,
      strategy: "head"
    });

    expect(result).toEqual({
      text: "abcdefgh",
      strategy: "head",
      truncated: true,
      originalLength: 26,
      length: 8
    });
  });

  it("keeps the tail of long text", () => {
    const result = buildContextWindow({
      text: "abcdefghijklmnopqrstuvwxyz",
      maxChars: 8,
      strategy: "tail"
    });

    expect(result).toEqual({
      text: "stuvwxyz",
      strategy: "tail",
      truncated: true,
      originalLength: 26,
      length: 8
    });
  });

  it("keeps text around a marker", () => {
    const result = buildContextWindow({
      text: "before---<cursor>---after",
      maxChars: 12,
      strategy: "around-marker",
      marker: "<cursor>"
    });

    expect(result.text).toContain("<cursor>");
    expect(result).toMatchObject({
      strategy: "around-marker",
      truncated: true,
      originalLength: 25,
      length: 12
    });
  });

  it("falls back to head strategy when marker is missing", () => {
    const result = buildContextWindow({
      text: "abcdefghijklmnopqrstuvwxyz",
      maxChars: 8,
      strategy: "around-marker",
      marker: "<missing>"
    });

    expect(result).toEqual({
      text: "abcdefgh",
      strategy: "around-marker",
      truncated: true,
      originalLength: 26,
      length: 8
    });
  });

  it("falls back to head strategy when marker is omitted", () => {
    const result = buildContextWindow({
      text: "abcdefghijklmnopqrstuvwxyz",
      maxChars: 8,
      strategy: "around-marker"
    });

    expect(result.text).toBe("abcdefgh");
  });

  it("throws when maxChars is not positive", () => {
    expect(() =>
      buildContextWindow({
        text: "context",
        maxChars: 0,
        strategy: "head"
      })
    ).toThrow("maxChars must be a positive integer");
  });
});
