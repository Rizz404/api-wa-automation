export interface CsvContactRow {
  name?: string;
  phone: string;
  tags?: string[];
}

/**
 * Minimal CSV parser for contact imports. Supports an optional header row
 * (name,phone,tags) and a tags column separated by `;` or `|`.
 * Falls back to positional columns when no header is present.
 */
export function parseCsvContacts(content: string): CsvContactRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const splitRow = (line: string) =>
    line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

  let startIdx = 0;
  let nameIdx = 0;
  let phoneIdx = 1;
  let tagsIdx = 2;

  const header = splitRow(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => ['name', 'phone', 'tags'].includes(h));
  if (hasHeader) {
    startIdx = 1;
    nameIdx = header.indexOf('name');
    phoneIdx = header.indexOf('phone');
    tagsIdx = header.indexOf('tags');
  }

  const rows: CsvContactRow[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    const phone = phoneIdx >= 0 ? cols[phoneIdx] : cols[1];
    if (!phone) continue;
    const tagsRaw = tagsIdx >= 0 ? cols[tagsIdx] : undefined;
    rows.push({
      name: (nameIdx >= 0 ? cols[nameIdx] : cols[0]) || undefined,
      phone,
      tags: tagsRaw
        ? tagsRaw
            .split(/[;|]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    });
  }
  return rows;
}
