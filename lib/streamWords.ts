/** Split model output into readable increments without dropping its whitespace. */
export function streamWords(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? (text ? [text] : []);
}
