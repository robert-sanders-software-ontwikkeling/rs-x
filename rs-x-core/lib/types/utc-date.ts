export function utCDate(year: number, month: number = 0, date: number = 1, hours: number = 0, minutes: number = 0, seconds: number = 0, millisecond: number = 0): Date {
    return new Date(Date.UTC(year, month, date, hours, minutes, seconds, millisecond));
}