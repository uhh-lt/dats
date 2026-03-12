import { CodeRead } from "@api/models/CodeRead";
import { flatTreeWithRoot } from "@components/tree-explorer";
import { useComputeCodeTree } from "@core/code";
import { useAppSelector } from "@store/storeHooks";
import { useMemo } from "react";

export const useComputeCodesForSelection = () => {
  // global server state
  const { codeTree, allCodes } = useComputeCodeTree();

  // global client state
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);

  // computed
  const codesForSelection = useMemo(() => {
    let codesForSelection: CodeRead[] = [];
    if (!selectedCodeId) {
      // if no code is selected, return all codes
      codesForSelection = allCodes.data || [];
    } else {
      // if a code is selected, return itself and its children
      const parentCode = codeTree?.first((node) => node.model.data.id === selectedCodeId);
      if (!parentCode) {
        return [];
      }
      codesForSelection = flatTreeWithRoot(parentCode.model) as CodeRead[];
    }
    return codesForSelection;
  }, [allCodes, codeTree, selectedCodeId]);
  return codesForSelection;
};
