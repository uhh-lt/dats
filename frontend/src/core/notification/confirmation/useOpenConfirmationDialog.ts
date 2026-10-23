import { useOpenDialog } from "@store/global/dialogBusHooks";
import { useCallback } from "react";
import { ConfirmationEvent } from "./_types/ConfirmationEvent";

/** Opens the confirmation dialog (dialog bus key "confirmation"); onAccept / onReject run when the user picks a button. */
export const useOpenConfirmationDialog = () => {
  const openDialog = useOpenDialog("confirmation");

  return useCallback(
    ({ text, type, onAccept, onReject }: ConfirmationEvent) =>
      openDialog({ text, type }, (accepted) => (accepted ? onAccept() : onReject?.())),
    [openDialog],
  );
};
