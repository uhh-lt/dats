import { CodeHooks } from "@api/hooks/CodeHooks";
import { dataToTree, ITree } from "@components/tree-explorer";
import { CodeReadWithParent, EMPTY_CODE } from "@core/code";
import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";

// create a dummy root node that will hold the results
const dummyRootNode: CodeReadWithParent = { ...EMPTY_CODE, description: "This is the root node" };

export const useComputeProjectCodeTree = () => {
  // global server state
  const allCodes = CodeHooks.useGetAllCodesList();

  // computed
  const codeTree: Node<ITree<CodeReadWithParent>> | null = useMemo(() => {
    if (allCodes.data) {
      const tree = new Tree();
      return tree.parse<ITree<CodeReadWithParent>>(dataToTree(allCodes.data, dummyRootNode));
    } else {
      return null;
    }
  }, [allCodes.data]);

  return { codeTree, allCodes };
};
