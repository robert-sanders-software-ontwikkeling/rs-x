declare module 'vite-tsconfig-paths' {
  import { Plugin } from 'vite';
  function tsconfigPaths(): Plugin;
  export default tsconfigPaths;
}