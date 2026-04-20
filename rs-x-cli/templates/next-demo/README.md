# rsx-next-example

Website & docs: https://www.rsxjs.com/

This starter shows how to use RS-X in a Next.js app-router project with a
million-row virtual table that keeps rendering and expression memory bounded.

## Scripts

- `npm run dev` starts the Next.js dev server after running the RS-X build step
- `npm run build` generates RS-X artifacts and builds the production app
- `npm run start` starts the production server

## Structure

- `app/` contains the Next.js route files and global styles
- `components/` contains the client-side UI components
- `hooks/` contains reusable React hooks
- `lib/` contains the RS-X bootstrap and virtual-table state/data utilities

## Notes

- The demo defaults to dark mode.
- The UI uses `@rs-x/react` hooks in a Next.js client component tree.
- The generated RS-X cache files in `app/rsx-generated` are created by
  `npm run build:rsx`; they are not checked into the starter template.
