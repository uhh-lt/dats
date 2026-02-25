import { ITree, TreeExplorer } from "@components/tree-explorer";
import SquareIcon from "@mui/icons-material/Square";
import { Box, BoxProps } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import * as React from "react";
import { useCallback, useState } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead";
import { AnnoActions } from "../../../features/annotation/store/annoSlice";
import { CodeExportButton } from "../CodeExportButton";
import { CodeCreateListItemButton } from "../dialog/CodeCreateListItemButton";
import { CodeExplorerActionMenu } from "./_components/CodeExplorerActionMenu";
import { CodeExplorerNodeRenderer } from "./_components/CodeExplorerNodeRenderer";
import { useComputeCodeTree } from "./useComputeCodeTree";

const renderNode = (node: ITree<CodeRead>) => <CodeExplorerNodeRenderer node={node} />;
const renderActions = (node: ITree<CodeRead>) => <CodeExplorerActionMenu node={node} />;

export function CodeExplorer(props: BoxProps) {
  // custom hooks
  const { codeTree } = useComputeCodeTree();

  // global client state (redux)
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const expandedCodeIds = useAppSelector((state) => state.annotations.expandedCodeIds);
  const dispatch = useAppDispatch();

  // local client state
  const [codeFilter, setCodeFilter] = useState<string>("");

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
        />
      )}
    </Box>
  );
}

function ListActions() {
  return (
    <>
      <CodeCreateListItemButton parentCodeId={undefined} />
      <CodeExportButton />
    </>
  );
}
