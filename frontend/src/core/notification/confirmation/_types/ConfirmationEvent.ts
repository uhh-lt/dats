export interface ConfirmationEvent {
  text: string;
  type?: "DELETE" | undefined;
  onAccept: () => void;
  onReject?: () => void;
}
