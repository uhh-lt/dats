import { FolderHooks } from "@api/hooks/FolderHooks";
import { ProjectHooks } from "@api/hooks/ProjectHooks";
import { FolderRead } from "@api/models/FolderRead";
import { FolderType } from "@api/models/FolderType";
import { dataToTree, ITree } from "@components/tree-explorer";
import { useAppSelector } from "@store/storeHooks";
import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";

export const useComputeFolderTree = () => {
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
