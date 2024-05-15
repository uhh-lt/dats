import { useMemo } from "react";
import { useParams } from "react-router-dom";
import Tree, { Node } from "ts-tree-structure";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { IDataTree } from "../TreeExplorer/IDataTree.ts";
import { dataToTree } from "../TreeExplorer/TreeUtils.ts";

const useComputeTagTree = () => {
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // global server state
  // TODO: this is not the correct query, we are actually not interested in all codes!
  const allTags = ProjectHooks.useGetAllTags(projId);

  // computed
  const tagTree: Node<IDataTree> | null = useMemo(() => {
    if (allTags.data) {
      const tree = new Tree();
      return tree.parse<IDataTree>(dataToTree(allTags.data));
    } else {
      return null;
    }
  }, [allTags.data]);

  return { tagTree, allTags };
};

export default useComputeTagTree;
