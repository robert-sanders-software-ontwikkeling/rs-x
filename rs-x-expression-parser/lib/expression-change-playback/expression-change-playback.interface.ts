import { IExpressionChangeHistory } from '../expression-change-tracker/expression-change-history.interface';

export interface IExpressionChangePlayback {
    playForward(t: number, history: IExpressionChangeHistory[][]): void;
    playBackward(t: number, history: IExpressionChangeHistory[][]): void;
}