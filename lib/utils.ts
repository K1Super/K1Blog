export function formatDate(value: string): string {
  return value.replaceAll('-', '.');
}

export function formatDateFull(value: string): string {
  return value.replaceAll('-', ' / ');
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function postHref(slug: string): string {
  return `/posts/${slug}`;
}

export function tagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tag)}`;
}

export function readingLabel(minutes: number): string {
  return `${String(minutes).padStart(2, '0')} MIN`;
}

export function padIndex(index: number): string {
  return String(index + 1).padStart(3, '0');
}
