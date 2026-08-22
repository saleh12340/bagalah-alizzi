import type { ReactNode } from "react";

declare global {
  namespace React {
    type ReactNode = ReactNode;
  }
}

export {};
