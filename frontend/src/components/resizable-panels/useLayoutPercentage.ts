import { LayoutActions } from "@store/global/layoutSlice";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";

const DEFAULT_LAYOUT_PERCENTAGE = 30;

export const useLayoutPercentage = (componentName: string) => {
  const dispatch = useAppDispatch();
  const percentage = useAppSelector(
    (state) => state.layout.verticalPercentages[componentName] ?? DEFAULT_LAYOUT_PERCENTAGE,
  );

  const handleResize = useCallback(
    (newPercentage: number) => {
      dispatch(LayoutActions.setPercentage({ componentName, percentage: newPercentage }));
    },
    [dispatch, componentName],
  );

  return { percentage, handleResize };
};
