import SquareIcon from "@mui/icons-material/Square";
import { Box } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeCreateDialog from "../../Code/CodeCreateDialog.tsx";
import CodeCreateListItemButton from "../../Code/CodeCreateListItemButton.tsx";
import CodeEditButton from "../../Code/CodeEditButton.tsx";
import CodeEditDialog from "../../Code/CodeEditDialog.tsx";
import CodeToggleEnabledButton from "../../Code/CodeToggleEnabledButton.tsx";
import CodeToggleVisibilityButton from "../../Code/CodeToggleVisibilityButton.tsx";
import { DataTreeActionRendererProps } from "../../TreeExplorer/DataTreeView.tsx";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";
import useComputeProjectCodeTree from "./useComputeProjectCodeTree.ts";

const CodeActionRenderer = memo(({ node }: DataTreeActionRendererProps) => {
  return (
    <>
      <CodeEditButton code={node.data as CodeRead} />
      <CodeToggleVisibilityButton code={node} />
      <CodeToggleEnabledButton code={node} />
    </>
  );
});

function ProjectCodes() {
  // custom hooks
  const { codeTree, allCodes } = useComputeProjectCodeTree();

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
            onDataFilterChange={handleCodeFilterChange}
            // expansion
            expandedItems={expandedCodeIds}
            onExpandedItemsChange={handleExpandedCodeIdsChange}
            // renderers
            ActionRenderer={CodeActionRenderer}
            // components
            listActions={<CodeCreateListItemButton parentCodeId={undefined} />}
            filterActions={<CodeToggleEnabledButton code={codeTree?.model} />}
          />
          <CodeEditDialog codes={allCodes.data} />
        </>
      )}
      <CodeCreateDialog />
    </Box>
  );
}

export default memo(ProjectCodes);
