import SquareIcon from "@mui/icons-material/Square";
import { Box, BoxProps, Typography } from "@mui/material";
import * as React from "react";
import { useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { AnnoActions, isHiddenCodeId } from "../../../views/annotation/annoSlice.ts";
import ExporterButton from "../../Exporter/ExporterButton.tsx";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";
import CodeCreateListItemButton from "../CodeCreateListItemButton.tsx";
import CodeEditDialog from "../CodeEditDialog.tsx";
import CodeExplorerMenu from "./CodeExplorerMenu.tsx";
import useComputeCodeTree from "./useComputeCodeTree.ts";

function CodeExplorer(props: BoxProps) {
  // custom hooks
  const { codeTree, allCodes } = useComputeCodeTree();

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

  const handleSelectedCodeChange = (_event: React.SyntheticEvent, nodeIds: string[] | string | null) => {
    if (nodeIds === null) {
      dispatch(AnnoActions.setSelectedCodeId(undefined));
    } else {
      const id = parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds);
      dispatch(AnnoActions.setSelectedCodeId(selectedCodeId === id ? undefined : id));
    }
  };

  return (
    <Box {...props}>
      {allCodes.isSuccess && codeTree && (
        <>
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
            renderNode={(node) => <CodeNodeRenderer node={node} />}
            // actions
            renderActions={(node) => <CodeExplorerMenu code={node} />}
            renderListActions={() => (
              <>
                <CodeCreateListItemButton parentCodeId={undefined} />
                <ExporterButton
                  tooltip="Export codeset"
                  exporterInfo={{ type: "Codeset", singleUser: true, users: [], sdocId: -1 }}
                  iconButtonProps={{ color: "inherit" }}
                />
              </>
            )}
          />
          <CodeEditDialog codes={allCodes.data} />
        </>
      )}
    </Box>
  );
}

function CodeNodeRenderer({ node }: { node: IDataTree }) {
  const isHidden = useAppSelector(isHiddenCodeId(node.data.id));
  const dispatch = useAppDispatch();

  return (
    <Typography
      variant="body2"
      sx={{ fontWeight: "inherit", flexGrow: 1, ...(isHidden && { textDecoration: "line-through" }) }}
      onMouseEnter={() => dispatch(AnnoActions.setHoveredCodeId(node.data.id))}
      onMouseLeave={() => dispatch(AnnoActions.setHoveredCodeId(undefined))}
    >
      {node.data.name}
    </Typography>
  );
}

export default CodeExplorer;
