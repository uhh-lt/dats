import SquareIcon from "@mui/icons-material/Square";
import { Box, BoxProps } from "@mui/material";
import * as React from "react";
import { useEffect, useState } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import ExporterButton from "../../../features/Exporter/ExporterButton.tsx";
import MemoButton from "../../../features/Memo/MemoButton.tsx";
import TreeExplorer from "../../../features/TreeExplorer/TreeExplorer.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { KEYWORD_CODES } from "../../../utils/GlobalConstants.ts";
import { AnnoActions } from "../annoSlice.ts";
import CodeCreateListItemButton from "./CodeCreateListItemButton.tsx";
import CodeEditButton from "./CodeEditButton.tsx";
import CodeToggleVisibilityButton from "./CodeToggleVisibilityButton.tsx";
import { ICodeTree } from "./ICodeTree.ts";
import { flatTreeWithRoot } from "./TreeUtils.ts";
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
        dispatch(AnnoActions.setCodesForSelection(flatTreeWithRoot(parentCode.model)));
      } else {
        // the selected code was not found -> the selected code was invalid (probabily because of local storage / project change...)
        dispatch(AnnoActions.setSelectedParentCodeId(undefined));
      }
    } else if (allCodes.data) {
      dispatch(AnnoActions.setCodesForSelection(allCodes.data));
    } else {
      dispatch(AnnoActions.setCodesForSelection([]));
    }
  }, [dispatch, selectedCodeId, allCodes.data, codeTree]);

  // handle ui events
  const handleSelectCode = (_event: React.SyntheticEvent, nodeIds: string[] | string) => {
    const id = parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds);
    dispatch(AnnoActions.setSelectedParentCodeId(selectedCodeId === id ? undefined : id));
  };
  const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    dispatch(AnnoActions.expandCode(nodeId));
  };
  const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    const id = expandedCodeIds.indexOf(nodeId);
    const newCodeIds = [...expandedCodeIds];
    newCodeIds.splice(id, 1);
    dispatch(AnnoActions.setExpandedParentCodeIds(newCodeIds));
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
            setDataFilter={setCodeFilter}
            // expansion
            expandedDataIds={expandedCodeIds}
            handleCollapseClick={handleCollapseClick}
            handleExpandClick={handleExpandClick}
            // selection
            selectedDataId={selectedCodeId}
            handleSelectData={handleSelectCode}
            // actions
            renderActions={(node) => (
              <>
                <CodeToggleVisibilityButton code={node as ICodeTree} />
                <CodeEditButton code={(node as ICodeTree).data} />
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
