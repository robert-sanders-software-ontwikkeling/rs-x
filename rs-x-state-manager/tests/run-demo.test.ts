import { runDemo } from '../../demo/run-demo';

describe('Statemanager demos', () => {

    it('register-non-recursive-state.ts', async () => {
        await runDemo('rs-x-state-manager/register-non-recursive-state.ts')
    });

    it('register-recursive-state.ts', async () => {
        await runDemo('rs-x-state-manager/register-recursive-state.ts')
    });

    it('register-state-is-idempotent.ts', async () => {
        await runDemo('rs-x-state-manager/register-state-is-idempotent.ts')
    });

    it('state-manager-customize.ts', async () => {
        await runDemo('rs-x-state-manager/state-manager-customize.ts')
       
    });
});