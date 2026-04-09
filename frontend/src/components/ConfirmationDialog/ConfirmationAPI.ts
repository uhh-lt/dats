import eventBus from "../../EventBus.ts";

export interface ConfirmationEvent {
  text: string;
  type?: "DELETE" | "CONFIRM";
  onAccept: () => void;
  onReject?: () => void;
}

function openConfirmationDialog(data: ConfirmationEvent) {
  eventBus.dispatch("open-confirmation-dialog", data);
}

const ConfirmationAPI = { openConfirmationDialog };

export default ConfirmationAPI;
