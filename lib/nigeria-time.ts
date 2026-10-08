/** RetailOS operates in West Africa Time (UTC+01:00), regardless of device timezone. */
export const STORE_TIME_ZONE = "Africa/Lagos";
export function formatNigeriaDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-NG", {timeZone: STORE_TIME_ZONE, dateStyle: "medium", timeStyle: "short"}).format(new Date(value));
}
export function formatNigeriaDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-NG", {timeZone: STORE_TIME_ZONE, dateStyle: "medium"}).format(new Date(value));
}
