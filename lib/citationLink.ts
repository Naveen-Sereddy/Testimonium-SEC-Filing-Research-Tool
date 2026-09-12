export function citationPageUrl(fileUrl: string, page: number): string {
  return `${fileUrl}#page=${Math.max(1, Math.round(page))}`;
}
