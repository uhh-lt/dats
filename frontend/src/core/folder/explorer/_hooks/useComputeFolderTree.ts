import { dataToTree, ITree } from "@components/tree-explorer";
import { useGetProject } from "@core/project";
import { FolderRead } from "@models/FolderRead";
import { FolderType } from "@models/FolderType";
import { useAppSelector } from "@store/storeHooks";
import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";
import { useGetAllFolders } from "../../api/folderHooks";

export const useComputeFolderTree = () => {
  // global server state
  const allFolders = useGetAllFolders();

  // global client state
  const projectId = useAppSelector((state) => state.project.projectId);
  const project = useGetProject(projectId);

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
