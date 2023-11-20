import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { IconButtonProps } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SourceDocumentMetadataReadResolved } from "../../../../api/openapi";
import { useAppDispatch } from "../../../../plugins/ReduxHooks";
import { SearchActions } from "../../searchSlice";

interface DocumentMetadataAddFilterButtonProps {
  metadata: SourceDocumentMetadataReadResolved;
}

function DocumentMetadataAddFilterButton({
  metadata,
  ...props
}: DocumentMetadataAddFilterButtonProps & IconButtonProps) {
  const navigate = useNavigate();

  // global client state (redux)
  const dispatch = useAppDispatch();

  const handleAddMetadataFilter = useCallback(() => {
    dispatch(SearchActions.onAddMetadataFilter({ metadata }));
    navigate("../search");
  }, [dispatch, metadata, navigate]);

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
