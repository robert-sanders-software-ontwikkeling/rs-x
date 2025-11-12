declare const __DEV__: boolean;

declare namespace jest {
   interface Matchers<R> {
      toDeepEqualCircular(expected: unknown): R;
      observerEqualTo(expected: unknown);
   }
}
