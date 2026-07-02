import { useEffect, useRef } from "react";

export const useResetStateOnSearch = (searchParams: unknown[], resetFn: () => void) => {
  const isFirstRender = useRef(true);
  useEffect(() => {
    // Skip the first render to preserve restored Redux state
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    resetFn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetFn, ...searchParams]);
};
