import { useOpenDialog } from "@store/global/dialogBusSlice";
import { useCallback } from "react";
import { MemoDialogEvent } from "./_types/MemoDialogEvent";

export const useOpenMemoDialog = () => {
  const openDialog = useOpenDialog("memo");

  const openMemoDialog = useCallback(
    ({ onCreateSuccess, ...target }: MemoDialogEvent) => {
      openDialog(target, onCreateSuccess);
    },
    [openDialog],
  );

  return openMemoDialog;
};
