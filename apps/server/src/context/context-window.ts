export type ContextWindowStrategy = "head" | "tail" | "around-marker";

export type BuildContextWindowInput = {
  text: string;
  maxChars: number;
  strategy: ContextWindowStrategy;
  marker?: string;
};

export type ContextWindow = {
  text: string;
  strategy: ContextWindowStrategy;
  truncated: boolean;
  originalLength: number;
  length: number;
};

export function buildContextWindow(
  input: BuildContextWindowInput
): ContextWindow {
  if (!Number.isInteger(input.maxChars) || input.maxChars <= 0) {
    throw new Error("maxChars must be a positive integer");
  }

  const originalLength = input.text.length;

  if (originalLength <= input.maxChars) {
    return createContextWindow(input.text, input.strategy, originalLength);
  }

  if (input.strategy === "head") {
    return createContextWindow(
      input.text.slice(0, input.maxChars),
      input.strategy,
      originalLength
    );
  }

  if (input.strategy === "tail") {
    return createContextWindow(
      input.text.slice(originalLength - input.maxChars),
      input.strategy,
      originalLength
    );
  }

  return createContextWindow(
    buildAroundMarkerWindow(input),
    input.strategy,
    originalLength
  );
}

function buildAroundMarkerWindow(input: BuildContextWindowInput) {
  if (!input.marker) {
    return input.text.slice(0, input.maxChars);
  }

  const markerIndex = input.text.indexOf(input.marker);

  if (markerIndex === -1) {
    return input.text.slice(0, input.maxChars);
  }

  const markerCenter = markerIndex + Math.floor(input.marker.length / 2);
  const halfWindow = Math.floor(input.maxChars / 2);
  let start = markerCenter - halfWindow;
  let end = start + input.maxChars;

  if (start < 0) {
    start = 0;
    end = input.maxChars;
  }

  if (end > input.text.length) {
    end = input.text.length;
    start = Math.max(0, end - input.maxChars);
  }

  return input.text.slice(start, end);
}

function createContextWindow(
  text: string,
  strategy: ContextWindowStrategy,
  originalLength: number
): ContextWindow {
  return {
    text,
    strategy,
    truncated: text.length < originalLength,
    originalLength,
    length: text.length
  };
}
