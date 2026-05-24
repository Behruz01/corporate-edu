export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

const CATEGORY_LABELS: Record<string, string> = {
  aml_compliance: 'AML / Muvofiqlik',
  credit_service: 'Kredit xizmati',
  retail_service: 'Riteyl xizmat',
  client_service: 'Mijozlar xizmati',
  compliance: 'Muvofiqlik',
  sales: 'Sotuv',
  conflict: 'Nizolarni hal qilish',
  internal: 'Ichki jarayonlar',
};

const DIMENSION_LABELS: Record<string, string> = {
  correctness: "To'g'rilik",
  tone: 'Ohang va empatiya',
  processAdherence: 'Jarayonga rioya',
  resolution: 'Yechim',
  compliance: 'Muvofiqlik',
};

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? humanize(key);
}

export function dimensionLabel(key: string): string {
  return DIMENSION_LABELS[key] ?? humanize(key);
}
