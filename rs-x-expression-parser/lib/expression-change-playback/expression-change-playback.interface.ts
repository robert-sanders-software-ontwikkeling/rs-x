import { IExpressionChangeHistory } from '../expression-change-tracker/expression-change-history.interface';

export interface IExpressionChangePlayback {
    play(t: number, history: IExpressionChangeHistory[][]): void;
}