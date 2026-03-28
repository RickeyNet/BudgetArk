/** Strip control characters and null bytes, keeping normal whitespace (space, tab, newline). */
export const sanitizeTextInput = (text: string): string =>
  text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
