
export interface IObjectStorage {
    get<T>(key: string): Promise<T>;
    set<T>(key: string, value: T): Promise<void>;
    close(): void;
}