import dayjs from "dayjs";

export const DATE_TIME_FORMAT = "YYYY-MM-DD HH:mm:ss";

const DATE_TIME_KEY_PATTERN = /(?:At|Time|Datetime|Date)$/i;

export const isDateTimeField = (key: string) => DATE_TIME_KEY_PATTERN.test(key);

export const formatDateTime = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";

  const parsed = dayjs(value as string | number | Date);
  if (!parsed.isValid()) return String(value);

  return parsed.format(DATE_TIME_FORMAT);
};

export const formatRecordDates = (record: Record<string, unknown>) => {
  const next: Record<string, unknown> = { ...record };

  Object.keys(next).forEach(key => {
    if (!isDateTimeField(key)) return;
    const value = next[key];
    if (value === null || value === undefined || value === "") return;
    next[key] = formatDateTime(value);
  });

  return next;
};
