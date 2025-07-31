import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";
import FolderHooks from "../../../api/FolderHooks.ts";
import { FolderRead } from "../../../api/openapi/models/FolderRead.ts";
import { FolderType } from "../../../api/openapi/models/FolderType.ts";
import { ITree } from "../../TreeExplorer/ITree.ts";
import { dataToTree } from "../../TreeExplorer/TreeUtils.ts";

// create a dummy root node that will hold the results
const dummyRootNode: FolderRead = {
  created: "",
  name: "root",
  folder_type: FolderType.NORMAL,
  project_id: -1,
  updated: "",
  id: -1,
  parent_id: undefined,
};

const useComputeFolderTree = () => {
  // global server state
  const allFolders = FolderHooks.useGetAllFolders();

  // computed
  const folderTree: Node<ITree<FolderRead>> | null = useMemo(() => {
    if (allFolders.data) {
      const tree = new Tree();
      return tree.parse<ITree<FolderRead>>(dataToTree(allFolders.data, dummyRootNode));
    } else {
      return null;
    }
  }, [allFolders.data]);

  return { folderTree, allFolders };
};

export default useComputeFolderTree;
