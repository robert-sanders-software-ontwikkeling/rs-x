import type { Container } from "@rs-x/core";

declare global {
  interface Window {
    RSX_INJECTION_CONTAINER?: Container;
  }
}

export {};