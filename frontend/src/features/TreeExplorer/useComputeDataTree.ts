import { useMemo } from "react";
import { useParams } from "react-router-dom";
import Tree, { Node } from "ts-tree-structure";
import ProjectHooks from "../../api/ProjectHooks";
import { IDataTree } from "./IDataTree";
import { dataToTree } from "./TreeUtils";
import { KEYWORD_TAGS } from "../../utils/GlobalConstants";

const useComputeDataTree = () => {
  const { dataType } = useParams() as { dataType: string };
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // global server state
  // TODO: this is not the correct query, we are actually not interested in all codes!
  const tagsData = ProjectHooks.useGetAllTags(projId);
  const codesData = ProjectHooks.useGetAllCodes(projId);
  const allData = dataType === KEYWORD_TAGS ? tagsData : codesData;
  // computed
  const dataTree: Node<IDataTree> | null = useMemo(() => {
    if (allData.data) {
      const tree = new Tree();
      return tree.parse<IDataTree>(dataToTree(allData.data, dataType));
    } else {
      return null;
    }
  }, [allData.data, dataType]);

  return { dataTree, allData };
};

export default useComputeDataTree;
