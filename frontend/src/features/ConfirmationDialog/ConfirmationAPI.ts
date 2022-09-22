import eventBus from "../../EventBus";

export interface ConfirmationEvent {
  text: string;
  onAccept: () => void;
}

function openConfirmationDialog(data: ConfirmationEvent) {
  eventBus.dispatch("open-confirmation-dialog", data);
}

const ConfirmationAPI = { openConfirmationDialog };

export default ConfirmationAPI;
