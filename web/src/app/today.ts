import dayjs from 'dayjs';

/**
 * Today in the browser's time zone, `YYYY-MM-DD`. It only limits what the date pickers
 * offer; the API decides with its own configured time zone (decision X3).
 */
export const localToday = (): string => dayjs().format('YYYY-MM-DD');
