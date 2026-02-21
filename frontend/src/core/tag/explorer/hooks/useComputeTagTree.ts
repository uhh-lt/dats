import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";
import { TagRead } from "../../../../api/openapi/models/TagRead.ts";
import { TagHooks } from "../../../../api/TagHooks.ts";
import { ITree } from "../../../../components/TreeExplorer/ITree.ts";
import { dataToTree } from "../../../../components/TreeExplorer/TreeUtils.ts";

// create a dummy root node that will hold the results
const dummyRootNode: TagRead = {
  created: "",
  description: "This is the root node",
  name: "root",
  project_id: -1,
  updated: "",
  id: -1,
  color: "",
  parent_id: undefined,
  memo_ids: [],
};

export const useComputeTagTree = () => {
  // global server state
  const allTags = TagHooks.useGetAllTags();

  // computed
  const tagTree: Node<ITree<TagRead>> | null = useMemo(() => {
    if (allTags.data) {
      const tree = new Tree();
      return tree.parse<ITree<TagRead>>(dataToTree(allTags.data, dummyRootNode));
    } else {
      return null;
    }
  }, [allTags.data]);

  return { tagTree, allTags };
};
