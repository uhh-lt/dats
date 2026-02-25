import { useAppDispatch } from "@plugins/redux";
import { useCallback } from "react";
import { UIDialogActions } from "../../../store/global/dialogSlice";
import { MemoEvent } from "./_types/MemoEvent";

export const useOpenMemoDialog = () => {
  const dispatch = useAppDispatch();

  const openMemoDialog = useCallback(
    (data: MemoEvent) => {
      dispatch(UIDialogActions.openMemoDialog(data));
    },
    [dispatch],
  );

  return openMemoDialog;
};
