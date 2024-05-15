import SquareIcon from "@mui/icons-material/Square";
import { Box, BoxProps } from "@mui/material";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import ExporterButton from "../../../features/Exporter/ExporterButton.tsx";
import MemoButton from "../../../features/Memo/MemoButton.tsx";
import TreeExplorer from "../../../features/TreeExplorer/TreeExplorer.tsx";
import { flatTreeWithRoot } from "../../../features/TreeExplorer/TreeUtils.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { KEYWORD_CODES } from "../../../utils/GlobalConstants.ts";
import { AnnoActions } from "../annoSlice.ts";
import CodeCreateListItemButton from "./CodeCreateListItemButton.tsx";
import CodeEditButton from "./CodeEditButton.tsx";
import CodeToggleVisibilityButton from "./CodeToggleVisibilityButton.tsx";
import useComputeCodeTree from "./useComputeCodeTree.ts";

function CodeExplorer(props: BoxProps) {
  // custom hooks
  const { codeTree, allCodes } = useComputeCodeTree();

  // global client state (redux)
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const expandedCodeIds = useAppSelector((state) => state.annotations.expandedCodeIds);
  const dispatch = useAppDispatch();

  const [codeFilter, setCodeFilter] = useState<string>("");

  // effects
  // update global client state when selection changes
  // we tell the annotator which codes are available for selection in the combobox
  useEffect(() => {
    if (selectedCodeId && codeTree) {
      const parentCode = codeTree.first((node) => node.model.data.id === selectedCodeId);
      if (parentCode && parentCode.model) {
        // the selected code was found -> we update the codes for selection
        dispatch(AnnoActions.setCodesForSelection(flatTreeWithRoot(parentCode.model) as CodeRead[]));
      } else {
        // the selected code was not found -> the selected code was invalid (probabily because of local storage / project change...)
        dispatch(AnnoActions.setSelectedCodeId(undefined));
      }
    } else if (allCodes.data) {
      dispatch(AnnoActions.setCodesForSelection(allCodes.data));
    } else {
      dispatch(AnnoActions.setCodesForSelection([]));
    }
  }, [dispatch, selectedCodeId, allCodes.data, codeTree]);

  // handle ui events
  const handleExpandedDataIdsChange = useCallback(
    (newCodeIds: string[]) => {
      dispatch(AnnoActions.setExpandedCodeIds(newCodeIds));
    },
    [dispatch],
  );

  const handleSelectCode = (_event: React.SyntheticEvent, nodeIds: string[] | string) => {
    const id = parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds);
    dispatch(AnnoActions.setSelectedCodeId(selectedCodeId === id ? undefined : id));
  };

  return (
    <Box {...props}>
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
            onDataFilterChange={setCodeFilter}
            // expansion
            expandedDataIds={expandedCodeIds}
            onExpandedDataIdsChange={handleExpandedDataIdsChange}
            // selection
            selectedDataId={selectedCodeId}
            onSelectedDataIdChange={handleSelectCode}
            // actions
            renderActions={(node) => (
              <>
                <CodeToggleVisibilityButton code={node} />
                <CodeEditButton code={node.data as CodeRead} />
                <MemoButton attachedObjectId={node.data.id} attachedObjectType={AttachedObjectType.CODE} />
              </>
            )}
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
        </>
      )}
    </Box>
  );
}

export default CodeExplorer;
