import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { LayoutActions, LayoutSizeKeys } from "../../layoutSlice.ts";

export const useLayoutSize = (componentName: LayoutSizeKeys) => {
  const dispatch = useAppDispatch();
  const size = useAppSelector((state) => state.layout.sizes[componentName] ?? 300);

  const handleResize = useCallback(
    (newSize: number) => {
      dispatch(LayoutActions.setSize({ componentName, size: newSize }));
    },
    [dispatch, componentName],
  );

  return { size, handleResize };
};
