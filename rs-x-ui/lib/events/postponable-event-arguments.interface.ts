export interface IPostponableEventArguments {
   dataId?: string;
   data?: unknown;
   callback: () => void;
   postponed: boolean;
}
