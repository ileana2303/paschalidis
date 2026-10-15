"use client";

import { useEffect } from "react";

export function useLoadOnChange(load: () => void | Promise<void>) {
  useEffect(() => {
    void load();
  }, [load]);
}
