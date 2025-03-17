import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { LayoutActions } from "../../layoutSlice";

export function useVerticalPercentage(componentName: string, defaultPercentage: number = 50) {
  const percentage = useAppSelector((state) => state.layout.verticalPercentages[componentName] ?? defaultPercentage);

  const dispatch = useAppDispatch();
  const handleResize = useCallback(
    (newPercentage: number) => {
      dispatch(LayoutActions.setVerticalPercentage({ componentName, percentage: newPercentage }));
    },
    [componentName, dispatch],
  );

  return { percentage, handleResize };
}
