import { useMemo } from "react";
import { useParams } from "react-router-dom";
import Tree, { Node } from "ts-tree-structure";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { IDataTree } from "../../../features/TreeExplorer/IDataTree.ts";
import { dataToTree } from "../../../features/TreeExplorer/TreeUtils.ts";

const useComputeCodeTree = (returnAllCodes: boolean = false) => {
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // global server state
  const allCodes = ProjectHooks.useGetAllCodes(projId, returnAllCodes);

  // computed
  const codeTree: Node<IDataTree> | null = useMemo(() => {
    if (allCodes.data) {
      const tree = new Tree();
      return tree.parse<IDataTree>(dataToTree(allCodes.data));
    } else {
      return null;
    }
  }, [allCodes.data]);

  return { codeTree, allCodes };
};

export default useComputeCodeTree;
