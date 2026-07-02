import { useAppDispatch } from "@store/storeHooks";
import { useCallback } from "react";
import { MemoEvent } from "./_types/MemoEvent";
import { MemoDialogActions } from "./store/memoDialogSlice";

export const useOpenMemoDialog = () => {
  const dispatch = useAppDispatch();

  const openMemoDialog = useCallback(
    (data: MemoEvent) => {
      dispatch(MemoDialogActions.openMemoDialog(data));
    },
    [dispatch],
  );

  return openMemoDialog;
};
