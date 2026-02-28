export {};

declare global {
  type MonacoWorkerFactory = {
    getWorker: (_moduleId: string, label: string) => Worker;
  };

  interface MonacoEnvironmentHost {
    MonacoEnvironment?: MonacoWorkerFactory;
  }
}
