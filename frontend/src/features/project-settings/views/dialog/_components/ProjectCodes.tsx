import { ITree, TreeExplorer } from "@components/tree-explorer";
import {
  CodeCreateListItemButton,
  CodeEditButton,
  CodeToggleEnabledButton,
  CodeToggleVisibilityButton,
} from "@core/code";
import { CodeRead } from "@models/CodeRead";
import SquareIcon from "@mui/icons-material/Square";
import { Box } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { useComputeProjectCodeTree } from "./useComputeProjectCodeTree";

interface ProjectCodesProps {
  hiddenCodeIds: number[];
  onToggleCodeVisibility: (codeIds: number[]) => void;
}

export const ProjectCodes = memo(({ hiddenCodeIds, onToggleCodeVisibility }: ProjectCodesProps) => {
  // custom hooks
  const { codeTree } = useComputeProjectCodeTree();

  // local state
  const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState<string>("");

  const renderCodeActions = useCallback(
    (node: ITree<CodeRead>) => (
      <>
        <CodeEditButton code={node.data} />
        <CodeToggleVisibilityButton
          code={node}
          isHidden={hiddenCodeIds.includes(node.data.id)}
          onToggleVisibility={onToggleCodeVisibility}
        />
        <CodeToggleEnabledButton code={node} />
      </>
    ),
    [hiddenCodeIds, onToggleCodeVisibility],
  );

  const handleCodeFilterChange = useCallback((value: string) => {
    setCodeFilter(value);
  }, []);

  const handleExpandedCodeIdsChange = useCallback((ids: string[]) => {
    setExpandedCodeIds(ids);
  }, []);

  return (
    <Box className="h100">
      {codeTree && (
        <TreeExplorer
          sx={{ pt: 0 }}
          dataIcon={SquareIcon}
          // data
          dataTree={codeTree}
          // filter
          showFilter
          dataFilter={codeFilter}
          onDataFilterChange={handleCodeFilterChange}
          // expansion
          expandedItems={expandedCodeIds}
          onExpandedItemsChange={handleExpandedCodeIdsChange}
          // renderers
          renderActions={renderCodeActions}
          // components
          listActions={<CodeCreateListItemButton parentCodeId={undefined} />}
          filterActions={<CodeToggleEnabledButton code={codeTree?.model} />}
        />
      )}
    </Box>
  );
});
