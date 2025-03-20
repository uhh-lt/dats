import SquareIcon from "@mui/icons-material/Square";
import { Box, BoxProps } from "@mui/material";
import * as React from "react";
import { useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../../views/annotation/annoSlice.ts";
import ExporterButton from "../../Exporter/ExporterButton.tsx";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";
import CodeCreateListItemButton from "../CodeCreateListItemButton.tsx";
import CodeExplorerActionMenu from "./CodeExplorerActionMenu.tsx";
import CodeExplorerNodeRenderer from "./CodeExplorerNodeRenderer.tsx";
import useComputeCodeTree from "./useComputeCodeTree.ts";

const renderNode = (node: IDataTree) => <CodeExplorerNodeRenderer node={node} />;
const renderActions = (node: IDataTree) => <CodeExplorerActionMenu node={node} />;

function CodeExplorer(props: BoxProps) {
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
      <ExporterButton
        tooltip="Export codeset"
        exporterInfo={{ type: "Codeset", singleUser: true, users: [], sdocId: -1 }}
        iconButtonProps={{ color: "inherit" }}
      />
    </>
  );
}

export default CodeExplorer;
