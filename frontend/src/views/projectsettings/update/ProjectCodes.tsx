import SquareIcon from "@mui/icons-material/Square";
import { Box } from "@mui/material";
import React, { useCallback, useState } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeCreateDialog from "../../../features/CrudDialog/Code/CodeCreateDialog.tsx";
import CodeEditDialog from "../../../features/CrudDialog/Code/CodeEditDialog.tsx";
import TreeExplorer from "../../../features/TreeExplorer/TreeExplorer.tsx";
import { KEYWORD_CODES } from "../../../utils/GlobalConstants.ts";
import CodeCreateListItemButton from "../../annotation/CodeExplorer/CodeCreateListItemButton.tsx";
import CodeEditButton from "../../annotation/CodeExplorer/CodeEditButton.tsx";
import CodeToggleEnabledButton from "../../annotation/CodeExplorer/CodeToggleEnabledButton.tsx";
import CodeToggleVisibilityButton from "../../annotation/CodeExplorer/CodeToggleVisibilityButton.tsx";
import useComputeCodeTree from "../../annotation/CodeExplorer/useComputeCodeTree.ts";

function ProjectCodes() {
  // custom hooks
  const { codeTree, allCodes } = useComputeCodeTree(true);

  // local state
  const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState<string>("");
  const expandCodes = useCallback((codesToExpand: string[]) => {
    setExpandedCodeIds((prev) => {
      for (const codeId of codesToExpand) {
        if (prev.indexOf(codeId) === -1) {
          prev.push(codeId);
        }
      }
      return prev.slice();
    });
  }, []);

  // handle ui events
  const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    expandCodes([nodeId]);
  };
  const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    const id = expandedCodeIds.indexOf(nodeId);
    const newCodeIds = [...expandedCodeIds];
    newCodeIds.splice(id, 1);
    setExpandedCodeIds(newCodeIds);
  };

  return (
    <Box className="h100">
      {allCodes.isSuccess && codeTree && (
        <>
          <TreeExplorer
            sx={{ pt: 0 }}
            dataType={KEYWORD_CODES}
            dataIcon={SquareIcon}
            // data
            allData={allCodes.data}
            dataTree={codeTree}
            // filter
            showFilter
            dataFilter={codeFilter}
            setDataFilter={setCodeFilter}
            // expansion
            expandedDataIds={expandedCodeIds}
            handleCollapseClick={handleCollapseClick}
            handleExpandClick={handleExpandClick}
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
