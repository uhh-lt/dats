import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";
import FolderHooks from "../../../api/FolderHooks.ts";
import { FolderRead } from "../../../api/openapi/models/FolderRead.ts";
import { FolderType } from "../../../api/openapi/models/FolderType.ts";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { ITree } from "../../TreeExplorer/ITree.ts";
import { dataToTree } from "../../TreeExplorer/TreeUtils.ts";

// create a dummy root node that will hold the results

const useComputeFolderTree = () => {
  // global server state
  const allFolders = FolderHooks.useGetAllFolders();

  // global client state
  const projectId = useAppSelector((state) => state.project.projectId);
  const project = ProjectHooks.useGetProject(projectId);

  // computed
  const folderTree: Node<ITree<FolderRead>> | null = useMemo(() => {
    if (allFolders.data && project.data) {
      const rootNode: FolderRead = {
        created: "",
        name: `Project: ${project.data.title}`,
        folder_type: FolderType.NORMAL,
        project_id: project.data.id,
        updated: "",
        id: -1,
        parent_id: undefined,
      };

      const tree = new Tree();
      return tree.parse<ITree<FolderRead>>(dataToTree(allFolders.data, rootNode));
    } else {
      return null;
    }
  }, [allFolders.data, project.data]);

  return { folderTree, allFolders };
};

export default useComputeFolderTree;
