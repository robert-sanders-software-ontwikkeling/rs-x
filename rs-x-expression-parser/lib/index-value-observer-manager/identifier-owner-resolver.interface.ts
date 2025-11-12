export interface IIdentifierOwnerResolver {
   resolve(key: unknown, context?: unknown): object;
}
