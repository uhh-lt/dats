import { useAppDispatch } from "@store/storeHooks";
import { useCallback } from "react";
import { MemoDialogActions } from "./store/memoDialogSlice";
import { MemoEvent } from "./types/MemoEvent";

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
