export type AnswerSegment = { type: 'text'; value: string } | { type: 'citation'; id: number };

export function splitAnswerOnCitations(answer: string): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  const pattern = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(answer)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: answer.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'citation', id: Number(match[1]) });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < answer.length) {
    segments.push({ type: 'text', value: answer.slice(lastIndex) });
  }

  return segments;
}
