import { CodeRead } from "@api/models/CodeRead";
import { ITree, TreeExplorer } from "@components/tree-explorer";
import SquareIcon from "@mui/icons-material/Square";
import { Box, BoxProps, Typography } from "@mui/material";
import * as React from "react";
import { useCallback, useState } from "react";
import { CodeExportButton } from "../CodeExportButton";
import { CodeCreateListItemButton } from "../dialog";
import { CodeExplorerActionMenu } from "./_components/CodeExplorerActionMenu";
import { useComputeCodeTree } from "./useComputeCodeTree";

const renderActions = (node: ITree<CodeRead>) => <CodeExplorerActionMenu node={node} />;

interface CodeExplorerProps extends BoxProps {
  // code selection
  selectedCodeId?: number;
  onSelectedCodeIdChange: (codeId: number | undefined) => void;
  // code expansion
  expandedCodeIds: string[];
  onExpandedCodeIdsChange: (ids: string[]) => void;
  // code hiding
  hiddenCodeIds: number[];
  onHoverCodeIdChange: (codeId: number | undefined) => void;
}

export function CodeExplorer({
  selectedCodeId,
  onSelectedCodeIdChange,
  expandedCodeIds,
  onExpandedCodeIdsChange,
  hiddenCodeIds,
  onHoverCodeIdChange,
  ...props
}: CodeExplorerProps) {
  // custom hooks
  const { codeTree } = useComputeCodeTree();

  // local client state
  const [codeFilter, setCodeFilter] = useState<string>("");

  const handleSelectedCodeChange = useCallback(
    (_event: React.SyntheticEvent, nodeIds: string[] | string | null) => {
      if (nodeIds === null) {
        onSelectedCodeIdChange(undefined);
      } else {
        const id = parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds);
        onSelectedCodeIdChange(selectedCodeId === id ? undefined : id);
      }
    },
    [onSelectedCodeIdChange, selectedCodeId],
  );

  const renderNode = useCallback(
    (node: ITree<CodeRead>) => (
      <Typography
        variant="body2"
        sx={{
          fontWeight: "inherit",
          flexGrow: 1,
          ...(hiddenCodeIds.includes(node.data.id) && { textDecoration: "line-through" }),
        }}
        onMouseEnter={() => onHoverCodeIdChange(node.data.id)}
        onMouseLeave={() => onHoverCodeIdChange(undefined)}
      >
        {node.data.name}
      </Typography>
    ),
    [onHoverCodeIdChange, hiddenCodeIds],
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
          onExpandedItemsChange={onExpandedCodeIdsChange}
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
