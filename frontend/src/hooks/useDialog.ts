import { useCallback, useState } from "react";

interface UseDialogProps {
  onOpen?: () => void;
  onClose?: () => void;
}

export const useDialog = ({ onOpen, onClose }: UseDialogProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    if (onOpen) {
      onOpen();
    }
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;
      if (newState && onOpen) {
        onOpen();
      } else if (!newState && onClose) {
        onClose();
      }
      return newState;
    });
  }, [onOpen, onClose]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};
