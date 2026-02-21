import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";
import { CodeHooks } from "../../../api/CodeHooks.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { ITree } from "../../../components/TreeExplorer/ITree.ts";
import { dataToTree } from "../../../components/TreeExplorer/TreeUtils.ts";

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
