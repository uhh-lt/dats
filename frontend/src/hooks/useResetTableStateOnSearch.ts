import { TableActions } from "@store/generic/tableSlice";
import { useAppDispatch } from "@store/storeHooks";
import { useEffect, useRef } from "react";

export const useResetTableStateOnSearch = (searchParams: unknown[], tableActions: TableActions) => {
  const isFirstRender = useRef(true);
  const dispatch = useAppDispatch();
  useEffect(() => {
    // Skip the first render to preserve restored Redux state
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    dispatch(tableActions.onSearchParamsChange());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, ...searchParams]);
};

export const useResetTableStateOnSearch2 = (searchParams: unknown[], resetFn: () => void) => {
  const isFirstRender = useRef(true);
  const dispatch = useAppDispatch();
  useEffect(() => {
    // Skip the first render to preserve restored Redux state
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    resetFn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, resetFn, ...searchParams]);
};
