const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "for", "to", "with",
]);
 
export interface TokenizeOptions {
  removeStopWords?: boolean;
}
 

export function tokenize(text: string, options: TokenizeOptions = {}): string[] {
  if (!text) return [];
 
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);
 
  return options.removeStopWords
    ? words.filter((word) => !STOP_WORDS.has(word))
    : words;
}