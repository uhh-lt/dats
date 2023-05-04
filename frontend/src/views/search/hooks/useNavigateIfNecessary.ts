import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useNavigateIfNecessary() {
  // router
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (to: string) => {
      if (to !== location.pathname) {
        navigate(to);
      }
    },
    [location.pathname, navigate]
  );
}
