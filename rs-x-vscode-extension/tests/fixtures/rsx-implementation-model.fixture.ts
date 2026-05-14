export interface ICalculator {
  total(): number;
}

export class Calculator implements ICalculator {
  total(): number {
    return 42;
  }
}

export interface IModel {
  calculator: ICalculator;
}
