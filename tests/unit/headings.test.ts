import { describe, expect, it } from 'vitest';

import { extractHeadings, slugifyHeading } from '@/features/content/headings';

describe('headings', () => {
  it('builds stable Chinese heading slugs', () => {
    expect(slugifyHeading('精度不是装饰')).toBe('精度不是装饰');
    expect(slugifyHeading('刻度与留白！')).toBe('刻度与留白');
    expect(slugifyHeading('Hello World')).toBe('hello-world');
  });

  it('extracts level 2 and 3 headings only', () => {
    const source = `## 精度不是装饰\n\n### 刻度与留白\n\n正文\n\n## 误差要可见`;
    expect(extractHeadings(source)).toEqual([
      { level: 2, text: '精度不是装饰', id: '精度不是装饰' },
      { level: 3, text: '刻度与留白', id: '刻度与留白' },
      { level: 2, text: '误差要可见', id: '误差要可见' },
    ]);
  });
});
