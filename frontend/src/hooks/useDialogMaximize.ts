import { useCallback, useState } from "react";

export const useDialogMaximize = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev);
  }, []);

  return {
    isMaximized,
    toggleMaximize,
    setIsMaximized,
  };
};
