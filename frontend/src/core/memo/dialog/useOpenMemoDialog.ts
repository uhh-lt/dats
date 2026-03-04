import { useAppDispatch } from "@plugins/redux";
import { useCallback } from "react";
import { MemoEvent } from "./_types/MemoEvent";
import { MemoDialogActions } from "./memoDialogSlice";

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
