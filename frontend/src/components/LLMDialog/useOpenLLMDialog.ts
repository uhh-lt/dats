import { useCallback } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../store/dialogSlice.ts";
import { LLMAssistanceEvent } from "./LLMEvent.ts";

export const useOpenLLMDialog = () => {
  const dispatch = useAppDispatch();

  const openLLMDialog = useCallback(
    (event: LLMAssistanceEvent) => {
      dispatch(CRUDDialogActions.openLLMDialog({ event }));
    },
    [dispatch],
  );

  return openLLMDialog;
};
