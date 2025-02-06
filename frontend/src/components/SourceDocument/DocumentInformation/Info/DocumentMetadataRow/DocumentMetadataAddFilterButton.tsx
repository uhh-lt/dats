import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { IconButtonProps } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useCallback } from "react";
import { SourceDocumentMetadataReadResolved } from "../../../../../api/openapi/models/SourceDocumentMetadataReadResolved.ts";
import { useAppDispatch } from "../../../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../../../../views/search/DocumentSearch/searchSlice.ts";

interface DocumentMetadataAddFilterButtonProps {
  metadata: SourceDocumentMetadataReadResolved;
  filterName: string;
}

function DocumentMetadataAddFilterButton({
  metadata,
  filterName,
  ...props
}: DocumentMetadataAddFilterButtonProps & IconButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  const handleAddMetadataFilter = useCallback(() => {
    dispatch(SearchActions.onAddMetadataFilter({ metadata, filterName }));
  }, [dispatch, metadata, filterName]);

  return (
    <Tooltip title="Add as filter">
      <span>
        <IconButton {...props} onClick={handleAddMetadataFilter}>
          <FilterAltIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default DocumentMetadataAddFilterButton;
