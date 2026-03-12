export interface IDisposableOwner {
  canDispose?(): boolean;
  release(): void;
}
