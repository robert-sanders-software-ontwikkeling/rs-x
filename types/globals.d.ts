declare const __DEV__: boolean;

declare namespace jest {
   interface Matchers<R> {
      toDeepEqualCircular(expected: unknown): R;
      observerEqualTo(expected: unknown):R
      toOutput(expected: string): R;
      toOutputAsync(expected: string): Promise<R>;
      isWritableProperty(expected: string): Promise<R>;
   }
}
