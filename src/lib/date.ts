const WIB_OFFSET = 7;

export function getDateInWIB(date: Date = new Date()): Date {
  const wib = new Date(date.getTime() + WIB_OFFSET * 3600000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
}

export function getDayInWIB(date: Date = new Date()): number {
  const wib = new Date(date.getTime() + WIB_OFFSET * 3600000);
  return wib.getUTCDay();
}

const DAY_NAMES = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
export function getDayNameInWIB(date: Date = new Date()): string {
  return DAY_NAMES[getDayInWIB(date)];
}

export function getTimeInWIB(date: Date = new Date()): { hours: number; minutes: number } {
  const wib = new Date(date.getTime() + WIB_OFFSET * 3600000);
  return { hours: wib.getUTCHours(), minutes: wib.getUTCMinutes() };
}

export function formatTimeWIB(date: Date): string {
  const wib = new Date(date.getTime() + WIB_OFFSET * 3600000);
  return `${String(wib.getUTCHours()).padStart(2, "0")}:${String(wib.getUTCMinutes()).padStart(2, "0")}`;
}

export function getNowWIB(): Date {
  return new Date(Date.now() + WIB_OFFSET * 3600000);
}
