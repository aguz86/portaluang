export const formatRpInput = (value: string | number): string => {
  if (value === undefined || value === null) return '';
  const strVal = value.toString();
  const digits = strVal.replace(/\D/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('id-ID');
};

export const parseRpInput = (value: string): number => {
  if (!value) return 0;
  const digits = value.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

export const formatDateToDDMMYYYY = (date: Date = new Date()): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}${m}${y}`;
};

export const formatDateToDDMMYYYY_HHMM = (date: Date = new Date()): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${d}${m}${y}_${hh}${mm}`;
};
