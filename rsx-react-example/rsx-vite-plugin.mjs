export function rsxVitePlugin() {
  return {
    name: 'rsx-vite-transform',
    enforce: 'pre',
    transform() {
      return null;
    },
  };
}
