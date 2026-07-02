import { CodeHooks } from "@api/hooks/CodeHooks";
import { dataToTree, ITree } from "@components/tree-explorer";
import { CodeRead } from "@models/CodeRead";
import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";

// create a dummy root node that will hold the results
const dummyRootNode: CodeRead = {
  created: "",
  description: "This is the root node",
  name: "root",
  project_id: -1,
  updated: "",
  id: -1,
  color: "",
  parent_id: undefined,
  memo_ids: [],
  is_system: false,
};

export const useComputeCodeTree = () => {
  // global server state
  const allCodes = CodeHooks.useGetEnabledCodes();

  // computed
  const codeTree: Node<ITree<CodeRead>> | null = useMemo(() => {
    if (allCodes.data) {
      const tree = new Tree();
      return tree.parse<ITree<CodeRead>>(dataToTree(allCodes.data, dummyRootNode));
    } else {
      return null;
    }
  }, [allCodes.data]);

  return { codeTree, allCodes };
};
