import { Injectable } from '../dependency-injection';
import { dataProperties, type DateProperty, type IDatePropertyAccessor } from './date-property-accessor.interface';

@Injectable()
export class DatePropertyAccessor implements IDatePropertyAccessor {
    public readonly priority = 0;
    private readonly _setter = {
        year: (date: Date, value: number) => date.setFullYear(value),
        utcYear: (date: Date, value: number) => date.setUTCFullYear(value),
        month: (date: Date, value: number) => date.setMonth(value),
        utcMonth: (date: Date, value: number) => date.setUTCMonth(value),
        date: (date: Date, value: number) => date.setDate(value),
        utcDate: (date: Date, value: number) => date.setUTCDate(value),
        hours: (date: Date, value: number) => date.setHours(value),
        utcHours: (date: Date, value: number) => date.setUTCHours(value),
        minutes: (date: Date, value: number) => date.setMinutes(value),
        utcMinutes: (date: Date, value: number) => date.setUTCMinutes(value),
        seconds: (date: Date, value: number) => date.setSeconds(value),
        utcSeconds: (date: Date, value: number) => date.setUTCSeconds(value),
        milliseconds: (date: Date, value: number) => date.setMilliseconds(value),
        utcMilliseconds: (date: Date, value: number) => date.setUTCMilliseconds(value),
        time: (date: Date, value: number) => date.setTime(value),
    };
    private readonly _getters: Record<DateProperty, (date: Date) => number> = {
        year: (date) => date.getFullYear(),
        utcYear: (date) => date.getUTCFullYear(),
        month: (date) => date.getMonth(),
        utcMonth: (date) => date.getUTCMonth(),
        date: (date) => date.getDate(),
        utcDate: (date) => date.getUTCDate(),
        hours: (date) => date.getHours(),
        utcHours: (date) => date.getUTCHours(),
        minutes: (date) => date.getMinutes(),
        utcMinutes: (date) => date.getUTCMinutes(),
        seconds: (date) => date.getSeconds(),
        utcSeconds: (date) => date.getUTCSeconds(),
        milliseconds: (date) => date.getMilliseconds(),
        utcMilliseconds: (date) => date.getUTCMilliseconds(),
        time: (date) => date.getTime(),
    };

    public isAsync(): boolean {
        return false;
    }

    public getIndexes(): IterableIterator<DateProperty> {
        return dataProperties.values();
    }

    public hasValue(context: Date, index: DateProperty): boolean {
        return this.getValue(context, index) !== undefined;
    }

    public getResolvedValue(context: Date, index: DateProperty): unknown {
        return this.getValue(context, index);
    }

    public getValue(date: Date, index: DateProperty): unknown {
        return this._getters[index]?.(date);
    }

    public setValue(date: Date, index: DateProperty, value: number): void {
        this._setter[index]?.(date, value);
    }

    public applies(context: unknown, index: DateProperty): boolean {
        return context instanceof Date && !!this._getters[index]
    }
}