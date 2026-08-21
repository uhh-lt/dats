import { useAppDispatch } from "@store/storeHooks";
import { useCallback } from "react";
import { MemoDialogEvent } from "./_types/MemoDialogEvent";
import { MemoDialogActions } from "./memoDialogSlice";

export const useOpenMemoDialog = () => {
  const dispatch = useAppDispatch();

  const openMemoDialog = useCallback(
    (data: MemoDialogEvent) => {
      dispatch(MemoDialogActions.openMemoDialog(data));
    },
    [dispatch],
  );

  return openMemoDialog;
};
