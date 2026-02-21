import { eventBus } from "../../EventBus.ts";

export interface ConfirmationEvent {
  text: string;
  onAccept: () => void;
  onReject?: () => void;
}

function openConfirmationDialog(data: ConfirmationEvent) {
  eventBus.dispatch("open-confirmation-dialog", data);
}

export const ConfirmationAPI = { openConfirmationDialog };
