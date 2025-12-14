import { Injectable } from '../dependency-injection';
import { dataProperties, DateProperty, IDatePropertyAccessor } from './date-property-accessor.interface';

@Injectable()
export class DatePropertyAccessor implements IDatePropertyAccessor {

    private readonly _setter = {
        year: (date, value) => date.setFullYear(value),
        utcYear: (date, value) => date.setUTCFullYear(value),
        month: (date, value) => date.setMonth(value),
        utcMonth: (date, value) => date.setUTCMonth(value),
        date: (date, value) => date.setDate(value),
        utcDate: (date, value) => date.setUTCDate(value),
        hours: (date, value) => date.setHours(value),
        utcHours: (date, value) => date.setUTCHours(value),
        minutes: (date, value) => date.setMinutes(value),
        utcMinutes: (date, value) => date.setUTCMinutes(value),
        seconds: (date, value) => date.setSeconds(value),
        utcSeconds: (date, value) => date.setUTCSeconds(value),
        milliseconds: (date, value) => date.setMilliseconds(value),
        utcMilliseconds: (date, value) => date.setUTCMilliseconds(value),
        time: (date, value) => date.setTime(value),
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