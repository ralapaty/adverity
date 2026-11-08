const WIDE: Array<[number, number]> = [
  [0x1100, 0x115f],
  [0x2329, 0x232a],
  [0x2e80, 0x303e],
  [0x3040, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd],
];

const FULLWIDTH: Array<[number, number]> = [
  [0xff01, 0xff60],
  [0xffe0, 0xffe6],
];

function inRanges(code: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([start, end]) => code >= start && code <= end);
}

function isEmoji(code: number): boolean {
  return (
    (code >= 0x1f300 && code <= 0x1faff) ||
    (code >= 0x2600 && code <= 0x27bf) ||
    code === 0x00a9 ||
    code === 0x00ae ||
    code === 0x3030 ||
    code === 0x303d ||
    code === 0x3297 ||
    code === 0x3299
  );
}

/** Google-style display length. Wide, fullwidth, and emoji code points count as 2. */
export function googleCountedLength(text: string): number {
  let total = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (inRanges(code, WIDE) || inRanges(code, FULLWIDTH) || isEmoji(code)) total += 2;
    else if (code >= 0xfe00 && code <= 0xfe0f) total += 0;
    else total += 1;
  }
  return total;
}

export const HEADLINE_LIMIT = 30;
export const DESCRIPTION_LIMIT = 90;
