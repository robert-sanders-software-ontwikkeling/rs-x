import { Observable } from 'rxjs';
import { IResizeObserverEntry } from './resize-observer-entry.interface';

export interface IResizeObserverService {
   readonly resized: Observable<IResizeObserverEntry[]>;
   observe(target: Element): void;
   unobserve(target: Element): void;
}
