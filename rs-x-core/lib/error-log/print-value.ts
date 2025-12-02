import { PrettyPrinter } from './pretty-printer';

export function printValue(value: unknown): void {
    console.log(new PrettyPrinter().toString(value, false));
}