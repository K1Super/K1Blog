export const WORD_LIST_MAX = 1000;
export const WORD_TERM_MAX = 40;
export const WORD_LIST_FILE_MAX_BYTES = 1024 * 1024;

const INVALID_TERM_PATTERN = /[\r\n、\u0000-\u001f\u007f\u200b-\u200f\ufeff]/;
const HEADER_TOKENS = new Set([
  'term',
  'keyword',
  'keywords',
  'word',
  'words',
  '词',
  '词项',
  '关键词',
  '违禁词',
  '昵称',
  'nickname',
  'name',
]);

export type WordListParseResult = {
  terms: string[];
  total: number;
  duplicates: number;
  invalid: number;
  error?: string;
};

function normalizeImportedTerms(rawTerms: string[]): {
  terms: string[];
  duplicates: number;
  invalid: number;
} {
  const terms: string[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let invalid = 0;

  for (const raw of rawTerms) {
    const term = raw.trim();
    if (!term || term.length > WORD_TERM_MAX || INVALID_TERM_PATTERN.test(term)) {
      invalid += 1;
      continue;
    }

    const key = term.toLocaleLowerCase();
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }

    seen.add(key);
    terms.push(term);
  }

  return { terms, duplicates, invalid };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (inQuotes) throw new Error('unclosed quote');
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((item) => item.some((cell) => cell.trim() !== ''));
}

export function splitWordList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\r\n、]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function parseWordListFile(fileName: string, text: string): WordListParseResult {
  const emptyResult = { terms: [], total: 0, duplicates: 0, invalid: 0 };
  const extension = fileName.toLowerCase().split('.').pop() ?? '';
  if (extension !== 'csv' && extension !== 'txt') {
    return { ...emptyResult, error: '仅支持 .csv 或 .txt 文件' };
  }

  const content = text.replace(/^\ufeff/, '');
  let rawTerms: string[] = [];

  if (extension === 'txt') {
    rawTerms = content.split(/[\r\n、]/);
    while (rawTerms.length > 0 && rawTerms[rawTerms.length - 1]?.trim() === '') {
      rawTerms.pop();
    }
  } else {
    try {
      const rows = parseCsvRows(content);
      if (rows.length === 0) {
        return { ...emptyResult, error: '文件中没有可用词项' };
      }

      const firstCell = rows[0]?.[0]?.trim().toLocaleLowerCase() ?? '';
      const dataRows = HEADER_TOKENS.has(firstCell) ? rows.slice(1) : rows;
      rawTerms = dataRows.map((row) => row[0] ?? '');
    } catch {
      return { ...emptyResult, error: 'CSV 格式不完整，请检查引号是否闭合' };
    }
  }

  const normalized = normalizeImportedTerms(rawTerms);
  if (normalized.terms.length > WORD_LIST_MAX) {
    return {
      ...normalized,
      total: rawTerms.length,
      error: `单个词表最多 ${WORD_LIST_MAX} 项，请拆分文件`,
    };
  }

  if (normalized.terms.length === 0) {
    return { ...normalized, total: rawTerms.length, error: '文件中没有有效词项' };
  }

  return { ...normalized, total: rawTerms.length };
}

export function mergeWordList(
  current: string[],
  incoming: string[],
  mode: 'append' | 'replace',
): { terms: string[]; overflow: boolean; duplicates: number } {
  const currentTerms = normalizeImportedTerms(current);
  const incomingTerms = normalizeImportedTerms(incoming);

  if (mode === 'replace') {
    return {
      terms: incomingTerms.terms,
      overflow: incomingTerms.terms.length > WORD_LIST_MAX,
      duplicates: incomingTerms.duplicates,
    };
  }

  const seen = new Set(currentTerms.terms.map((term) => term.toLocaleLowerCase()));
  let duplicates = incomingTerms.duplicates;
  const merged = [...currentTerms.terms];

  for (const term of incomingTerms.terms) {
    const key = term.toLocaleLowerCase();
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    merged.push(term);
  }

  return {
    terms: merged,
    overflow: merged.length > WORD_LIST_MAX,
    duplicates,
  };
}
