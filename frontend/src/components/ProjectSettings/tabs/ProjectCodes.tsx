import SquareIcon from "@mui/icons-material/Square";
import { Box } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { CodeToggleEnabledButton } from "../../../core/code/CodeToggleEnabledButton.tsx";
import { CodeToggleVisibilityButton } from "../../../core/code/CodeToggleVisibilityButton.tsx";
import { CodeCreateListItemButton } from "../../../core/code/dialog/CodeCreateListItemButton.tsx";
import { CodeEditButton } from "../../../core/code/dialog/CodeEditButton.tsx";
import { ITree } from "../../TreeExplorer/ITree.ts";
import { TreeExplorer } from "../../TreeExplorer/TreeExplorer.tsx";
import { useComputeProjectCodeTree } from "./useComputeProjectCodeTree.ts";

const renderCodeActions = (node: ITree<CodeRead>) => (
  <>
    <CodeEditButton code={node.data} />
    <CodeToggleVisibilityButton code={node} />
    <CodeToggleEnabledButton code={node} />
  </>
);

export const ProjectCodes = memo(() => {
  // custom hooks
  const { codeTree } = useComputeProjectCodeTree();

  // local state
  const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState<string>("");

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
