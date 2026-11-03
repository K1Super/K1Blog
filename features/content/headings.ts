export type Heading = {
  level: 2 | 3;
  text: string;
  id: string;
};

export function slugifyHeading(text: string): string {
  const normalized = text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[，。！？、；：""''（）《》〈〉【】…—·]/g, '')
    .trim()
    .toLowerCase();
  const slug = normalized.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
  return slug || 'section';
}

export function extractHeadings(source: string): Heading[] {
  const headings: Heading[] = [];
  for (const line of source.split(/\r?\n/)) {
    const match = /^(##|###)\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const marker = match[1];
    const text = match[2]?.trim() ?? '';
    if (!marker || !text) continue;
    headings.push({
      level: marker.length === 2 ? 2 : 3,
      text: text.replace(/[*_`]/g, ''),
      id: slugifyHeading(text),
    });
  }
  return headings;
}
