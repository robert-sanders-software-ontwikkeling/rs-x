import * as rxjs from 'rxjs';
import * as operators from 'rxjs/operators';

type RxjsCore = typeof rxjs;
type RxjsOps = typeof operators;

// Keys that exist in BOTH core and operators (these cause the overload/type conflicts)
type CollidingKeys = keyof RxjsCore & keyof RxjsOps;

// Operators that do NOT collide can safely be lifted to top-level ($.map, $.pairwise, ...)
type NonCollidingOps = Omit<RxjsOps, CollidingKeys>;

/**
 * Final scope:
 * - All core RxJS exports (interval, combineLatest, Observable, ...)
 * - All NON-colliding operators directly on the scope (map, pairwise, bufferCount, ...)
 * - ALL operators available under $.op.* (including colliding names)
 */
export type RxJsScope = RxjsCore & NonCollidingOps & { op: RxjsOps };

function buildRxjsScope(): RxJsScope {
  const core = rxjs;
  const op = operators;

  // Start with core exports and an operators namespace
  const scope: Record<string, unknown> = {
    ...core,
    op,
  };

  // Lift only non-colliding operators onto the top-level scope
  for (const key of Object.keys(op) as Array<keyof RxjsOps>) {
    if (!(key in core)) {
      scope[key as string] = op[key];
    }
  }

  return scope as RxJsScope;
}

export const rxjsScope = buildRxjsScope();
