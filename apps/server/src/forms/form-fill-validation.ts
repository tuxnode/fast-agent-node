import type { FormField } from "./form-fill.js";

type ValidateFormFillSuggestionsInput = {
  suggestions: Record<string, string>;
  missingFields: string[];
  warnings: string[];
  fillableFields: FormField[];
};

export function validateFormFillSuggestions({
  suggestions,
  missingFields,
  warnings,
  fillableFields
}: ValidateFormFillSuggestionsInput) {
  const validatedSuggestions: Record<string, string> = {};
  const validatedMissingFields = new Set(missingFields);
  const validatedWarnings = [...warnings];

  for (const field of fillableFields) {
    const value = suggestions[field.name];

    if (value === undefined) {
      if (field.required) {
        validatedMissingFields.add(field.name);
      }

      continue;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      validatedWarnings.push(
        `Removed empty suggestion for field "${field.name}".`
      );

      if (field.required) {
        validatedMissingFields.add(field.name);
      }

      continue;
    }

    if (
      field.type === "select" &&
      field.options &&
      !field.options.includes(trimmedValue)
    ) {
      validatedWarnings.push(
        `Removed invalid option "${trimmedValue}" for field "${field.name}".`
      );

      if (field.required) {
        validatedMissingFields.add(field.name);
      }

      continue;
    }

    validatedSuggestions[field.name] = trimmedValue;
  }

  return {
    suggestions: validatedSuggestions,
    missingFields: [...validatedMissingFields],
    warnings: validatedWarnings
  };
}
