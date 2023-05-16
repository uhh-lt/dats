import { useMemo } from "react";
import { useParams } from "react-router-dom";
import Tree, { Node } from "ts-tree-structure";
import ProjectHooks from "../../../api/ProjectHooks";
import ICodeTree from "./ICodeTree";
import { codesToTree } from "./TreeUtils";

const useComputeCodeTree = () => {
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // global server state
  // TODO: this is not the correct query, we are actually not interested in all codes!
  const allCodes = ProjectHooks.useGetAllCodes(projId);

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
