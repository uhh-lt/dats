import SquareIcon from "@mui/icons-material/Square";
import { Box } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeCreateListItemButton from "../../Code/CodeCreateListItemButton.tsx";
import CodeEditButton from "../../Code/CodeEditButton.tsx";
import CodeToggleEnabledButton from "../../Code/CodeToggleEnabledButton.tsx";
import CodeToggleVisibilityButton from "../../Code/CodeToggleVisibilityButton.tsx";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";
import useComputeProjectCodeTree from "./useComputeProjectCodeTree.ts";

const renderCodeActions = (node: IDataTree) => (
  <>
    <CodeEditButton code={node.data as CodeRead} />
    <CodeToggleVisibilityButton code={node} />
    <CodeToggleEnabledButton code={node} />
  </>
);

function ProjectCodes() {
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
}

export default memo(ProjectCodes);
