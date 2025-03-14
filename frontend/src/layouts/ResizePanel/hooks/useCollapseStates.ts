import { useEffect, useState } from "react";

const COLLAPSED_MIN = 0;
const COLLAPSED_MAX = 100;

interface CollapseStatesConfig {
  currentPercentage: number;
  minPercentage: number;
}

export function useCollapseStates({ currentPercentage, minPercentage }: CollapseStatesConfig) {
  const [isFirstCollapsed, setIsFirstCollapsed] = useState(currentPercentage <= COLLAPSED_MIN);
  const [isSecondCollapsed, setIsSecondCollapsed] = useState(currentPercentage >= COLLAPSED_MAX);

  useEffect(() => {
    setIsFirstCollapsed(currentPercentage <= COLLAPSED_MIN);
    setIsSecondCollapsed(currentPercentage >= COLLAPSED_MAX);
  }, [currentPercentage]);

  const handleCollapseChange = (newPercentage: number): number => {
    if (newPercentage < minPercentage / 2) {
      setIsFirstCollapsed(true);
      setIsSecondCollapsed(false);
      return COLLAPSED_MIN;
    }

    if (newPercentage > 100 - minPercentage / 2) {
      setIsFirstCollapsed(false);
      setIsSecondCollapsed(true);
      return COLLAPSED_MAX;
    }

    setIsFirstCollapsed(false);
    setIsSecondCollapsed(false);
    return newPercentage;
  };

  return {
    isFirstCollapsed,
    isSecondCollapsed,
    handleCollapseChange,
  };
}
