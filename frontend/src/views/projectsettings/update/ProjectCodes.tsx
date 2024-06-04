import SquareIcon from "@mui/icons-material/Square";
import { Box } from "@mui/material";
import { useState } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeCreateDialog from "../../../components/Code/CodeCreateDialog.tsx";
import CodeCreateListItemButton from "../../../components/Code/CodeCreateListItemButton.tsx";
import CodeEditButton from "../../../components/Code/CodeEditButton.tsx";
import CodeEditDialog from "../../../components/Code/CodeEditDialog.tsx";
import useComputeCodeTree from "../../../components/Code/CodeExplorer/useComputeCodeTree.ts";
import CodeToggleEnabledButton from "../../../components/Code/CodeToggleEnabledButton.tsx";
import CodeToggleVisibilityButton from "../../../components/Code/CodeToggleVisibilityButton.tsx";
import TreeExplorer from "../../../components/TreeExplorer/TreeExplorer.tsx";

function ProjectCodes() {
  // custom hooks
  const { codeTree, allCodes } = useComputeCodeTree(true);

  // local state
  const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState<string>("");

  return (
    <Box className="h100">
      {allCodes.isSuccess && codeTree && (
        <>
          <TreeExplorer
            sx={{ pt: 0 }}
            dataIcon={SquareIcon}
            // data
            allData={allCodes.data}
            dataTree={codeTree}
            // filter
            showFilter
            dataFilter={codeFilter}
            onDataFilterChange={setCodeFilter}
            // expansion
            expandedDataIds={expandedCodeIds}
            onExpandedDataIdsChange={setExpandedCodeIds}
            // actions
            renderActions={(node) => (
              <>
                <CodeEditButton code={node.data as CodeRead} />
                <CodeToggleVisibilityButton code={node} />
                <CodeToggleEnabledButton code={node} />
              </>
            )}
            renderListActions={() => (
              <>
                <CodeCreateListItemButton parentCodeId={undefined} />
              </>
            )}
            renderFilterActions={() => (
              <>
                <CodeToggleEnabledButton code={codeTree?.model} />
              </>
            )}
          />
          <CodeEditDialog codes={allCodes.data} />
        </>
      )}
      <CodeCreateDialog />
    </Box>
  );
}

export default ProjectCodes;
