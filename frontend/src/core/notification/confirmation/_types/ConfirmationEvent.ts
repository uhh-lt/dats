export interface ConfirmationEvent {
  text: string;
  onAccept: () => void;
  onReject?: () => void;
}
