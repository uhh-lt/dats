import { LayoutActions } from "@store/global/layoutSlice";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";

const DEFAULT_LAYOUT_SIZE = 300;

export const useLayoutSize = (componentName: string) => {
  const dispatch = useAppDispatch();
  const size = useAppSelector((state) => state.layout.sizes[componentName] ?? DEFAULT_LAYOUT_SIZE);

  const handleResize = useCallback(
    (newSize: number) => {
      dispatch(LayoutActions.setSize({ componentName, size: newSize }));
    },
    [dispatch, componentName],
  );

  return { size, handleResize };
};
