import { useMemo } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import useComputeCodeTree from "../../../components/Code/CodeExplorer/useComputeCodeTree.ts";
import { flatTreeWithRoot } from "../../../components/TreeExplorer/TreeUtils.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

export const useComputeCodesForSelection = () => {
  // global server state
  const { codeTree } = useComputeCodeTree();

  // global client state
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const mostRecentCodeId = useAppSelector((state) => state.annotations.mostRecentCodeId);

  // computed
  const codesForSelection = useMemo(() => {
    if (!codeTree) {
      return [];
    }

    const parentCode = codeTree.first((node) => node.model.data.id === selectedCodeId);
    if (!parentCode) {
      return [];
    }

    const codesForSelection = flatTreeWithRoot(parentCode.model) as CodeRead[];

    // add the most recent code to the top of the list
    const idx = codesForSelection.findIndex((t) => t.id === mostRecentCodeId);
    const code = codesForSelection[idx];
    codesForSelection.splice(idx, 1);
    codesForSelection.unshift(code);

    return codesForSelection;
  }, [codeTree, mostRecentCodeId, selectedCodeId]);

  return codesForSelection;
};
