import { IconButtonProps } from "@mui/material";
import React, { useCallback } from "react";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { SourceDocumentMetadataRead } from "../../../../api/openapi";
import { createMetadataFilter } from "../../SearchFilter";
import { SearchActions } from "../../searchSlice";
import { useAppDispatch } from "../../../../plugins/ReduxHooks";
import { useNavigate } from "react-router-dom";

interface DocumentMetadataAddFilterButtonProps {
  metadata: SourceDocumentMetadataRead;
}

function DocumentMetadataAddFilterButton({
  metadata,
  ...props
}: DocumentMetadataAddFilterButtonProps & IconButtonProps) {
  const navigate = useNavigate();

  // global client state (redux)
  const dispatch = useAppDispatch();

  const handleAddMetadataFilter = useCallback(() => {
    dispatch(SearchActions.addFilter(createMetadataFilter(metadata.key, metadata.value)));
    navigate("../search");
  }, [dispatch, metadata.key, metadata.value]);

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
