/**
 * Renders a string template, replacing {{key}} (or {{ key }}) placeholders
 * with values from the provided context. Missing keys render as empty string.
 */
export function renderTemplate(
  template: string,
  context: Record<string, any> = {},
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = key
      .split('.')
      .reduce<any>((acc, part) => (acc == null ? acc : acc[part]), context);
    return value === undefined || value === null ? '' : String(value);
  });
}
