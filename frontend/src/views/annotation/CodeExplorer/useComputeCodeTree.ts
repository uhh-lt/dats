import { useMemo } from "react";
import { useParams } from "react-router-dom";
import Tree, { Node } from "ts-tree-structure";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { ICodeTree } from "./ICodeTree.ts";
import { codesToTree } from "./TreeUtils.ts";

const useComputeCodeTree = (returnAllCodes: boolean = false) => {
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // global server state
  // TODO: this is not the correct query, we are actually not interested in all codes!
  const allCodes = ProjectHooks.useGetAllCodes(projId, returnAllCodes);

  // computed
  const codeTree: Node<ICodeTree> | null = useMemo(() => {
    if (allCodes.data) {
      const tree = new Tree();
      return tree.parse<ICodeTree>(codesToTree(allCodes.data));
    } else {
      return null;
    }
  }, [allCodes.data]);

  return { codeTree, allCodes };
};

export default useComputeCodeTree;
