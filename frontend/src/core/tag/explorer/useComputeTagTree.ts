import { tagQueries } from "@api/queries/tagQueries";
import { dataToTree, ITree } from "@components/tree-explorer";
import { TagRead } from "@models/TagRead";
import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";

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
  const projectId = useAppSelector((state) => state.project.projectId);
  const allTags = useQuery(tagQueries.byProject(projectId));

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
