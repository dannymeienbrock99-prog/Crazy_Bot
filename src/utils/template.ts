export type TemplateValues = Record<string, string | number | undefined | null>;

export function renderTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? '' : String(value);
  });
}
