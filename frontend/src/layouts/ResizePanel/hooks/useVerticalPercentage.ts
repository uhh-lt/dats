import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { LayoutActions } from "../../layoutSlice";

export function useVerticalPercentage(componentName: string) {
  const percentage = useAppSelector((state) => state.layout.verticalPercentages[componentName]);

  const dispatch = useAppDispatch();
  const handleResize = useCallback(
    (newPercentage: number) => {
      dispatch(LayoutActions.setVerticalPercentage({ componentName, percentage: newPercentage }));
    },
    [componentName, dispatch],
  );

  return { percentage, handleResize };
}
