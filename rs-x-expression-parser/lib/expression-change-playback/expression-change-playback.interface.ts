import { IExpressionChangeHistory } from '../expression-change-tracker';

export interface IExpressionChangePlayback {
    playForward(t: number, history: IExpressionChangeHistory[][]): void;
    playBackward(t: number, history: IExpressionChangeHistory[][]): void;
}