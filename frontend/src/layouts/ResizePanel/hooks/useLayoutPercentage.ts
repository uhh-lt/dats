import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { LayoutActions, LayoutPercentageKeys } from "../../layoutSlice.ts";

export const useLayoutPercentage = (componentName: LayoutPercentageKeys) => {
  const dispatch = useAppDispatch();
  const percentage = useAppSelector((state) => state.layout.verticalPercentages[componentName] ?? 50);

  const handleResize = useCallback(
    (newPercentage: number) => {
      dispatch(LayoutActions.setPercentage({ componentName, percentage: newPercentage }));
    },
    [dispatch, componentName],
  );

  return { percentage, handleResize };
};
