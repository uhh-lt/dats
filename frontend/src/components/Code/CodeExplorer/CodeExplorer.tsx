import SquareIcon from "@mui/icons-material/Square";
import { Box, BoxProps } from "@mui/material";
import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../../views/annotation/annoSlice.ts";
import ExportCodesButton from "../../Export/ExportCodesButton.tsx";
import { ITree } from "../../TreeExplorer/ITree.ts";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";
import { flatTree } from "../../TreeExplorer/TreeUtils.ts";
import { useTreeSortOrder } from "../../../hooks/useTreeSortOrder.ts";
import CodeCreateListItemButton from "../CodeCreateListItemButton.tsx";
import CodeExplorerActionMenu from "./CodeExplorerActionMenu.tsx";
import CodeExplorerNodeRenderer from "./CodeExplorerNodeRenderer.tsx";
import useComputeCodeTree from "./useComputeCodeTree.ts";

const renderNode = (node: ITree<CodeRead>) => <CodeExplorerNodeRenderer node={node} />;
const renderActions = (node: ITree<CodeRead>) => <CodeExplorerActionMenu node={node} />;

interface CodeExplorerProps {
  projectId?: number;
}

function CodeExplorer({ projectId, ...props }: CodeExplorerProps & BoxProps) {
  // custom hooks
  const { codeTree, allCodes } = useComputeCodeTree();

  // global client state (redux)
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const expandedCodeIds = useAppSelector((state) => state.annotations.expandedCodeIds);
  const dispatch = useAppDispatch();

  // local client state
  const [codeFilter, setCodeFilter] = useState<string>("");

  // Get all code IDs from the tree
  const allCodeIds = useMemo(() => {
    if (!codeTree) return [];
    return flatTree(codeTree.model).map((code) => code.id);
  }, [codeTree]);

  // Extract projectId from data for dependency tracking
  const dataProjectId = allCodes.data?.[0]?.project_id;

  // Use project ID from props or derive from data (fallback)
  // Note: In practice, all codes belong to the same project (enforced by backend)
  // Ideally, projectId should be passed as a prop from parent components
  const effectiveProjectId = useMemo(() => {
    return projectId ?? dataProjectId;
  }, [projectId, dataProjectId]);

  // Use custom sort order hook
  const { sortOrder, updateSortOrder } = useTreeSortOrder(
    "code-sort-order",
    effectiveProjectId,
    allCodeIds
  );

  // handle ui events
  const handleExpandedCodeIdsChange = useCallback(
    (newCodeIds: string[]) => {
      dispatch(AnnoActions.setExpandedCodeIds(newCodeIds));
    },
    [dispatch],
  );

  const handleSelectedCodeChange = useCallback(
    (_event: React.SyntheticEvent, nodeIds: string[] | string | null) => {
      if (nodeIds === null) {
        dispatch(AnnoActions.setSelectedCodeId(undefined));
      } else {
        const id = parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds);
        dispatch(AnnoActions.setSelectedCodeId(selectedCodeId === id ? undefined : id));
      }
    },
    [dispatch, selectedCodeId],
  );

  return (
    <Box {...props}>
      {codeTree && (
        <TreeExplorer
          sx={{ pt: 0 }}
          dataIcon={SquareIcon}
          // data
          dataTree={codeTree}
          // filter
          showFilter
          dataFilter={codeFilter}
          onDataFilterChange={setCodeFilter}
          // expansion
          expandedItems={expandedCodeIds}
          onExpandedItemsChange={handleExpandedCodeIdsChange}
          // selection
          selectedItems={selectedCodeId}
          onSelectedItemsChange={handleSelectedCodeChange}
          // render node
          renderNode={renderNode}
          // actions
          renderActions={renderActions}
          // components
          listActions={<ListActions />}
          // drag and drop for reordering
          draggableItems={true}
          sortOrder={sortOrder}
          onSortOrderChange={updateSortOrder}
        />
      )}
    </Box>
  );
}

function ListActions() {
  return (
    <>
      <CodeCreateListItemButton parentCodeId={undefined} />
      <ExportCodesButton />
    </>
  );
}

export default CodeExplorer;
