import { Observable } from 'rxjs';

export interface IStructuralDirective {
   readonly bound: Observable<void>;
   attach(): Promise<void>;
   detach(): void;
}
