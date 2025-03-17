import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { LayoutActions } from "../../layoutSlice";

export function useVerticalPercentage(componentName: string, defaultPercentage: number = 50) {
  const dispatch = useAppDispatch();
  const percentage = useAppSelector((state) => state.layout.verticalPercentages[componentName] ?? defaultPercentage);

  const handleResize = (newPercentage: number) => {
    dispatch(LayoutActions.setVerticalPercentage({ componentName, percentage: newPercentage }));
  };

  return { percentage, handleResize };
}
