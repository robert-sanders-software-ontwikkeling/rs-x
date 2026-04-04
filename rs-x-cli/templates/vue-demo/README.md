# rsx-vue-example

Website & docs: https://www.rsxjs.com/

This starter shows how to use RS-X in a Vue 3 application with a million-row
virtual table that keeps rendering and expression memory bounded.

## Scripts

- `npm run dev` runs the RS-X build step and starts Vite
- `npm run build` generates RS-X artifacts and builds the production app
- `npm run preview` previews the production build

## Structure

- `src/App.vue` contains the app shell and theme toggle
- `src/components/` contains UI components
- `src/composables/` contains reusable Vue composables
- `src/lib/` contains RS-X bootstrap and virtual-table state/data utilities
- `src/env.d.ts` declares Vue SFC modules for the RS-X build/typecheck pass

## Notes

- The demo defaults to dark mode.
- It uses the `useRsxExpression` composable from `@rs-x/vue`.
- The generated RS-X cache files in `src/rsx-generated` are created by
  `npm run build:rsx`; they are not checked into the starter template.
