import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import * as React from "react";
import { SearchActions } from "../../searchSlice";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";
import { IconButtonProps } from "@mui/material";

interface ToggleShowTagsButtonProps {}

function ToggleShowTagsButton({ ...props }: ToggleShowTagsButtonProps & IconButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const showTags = useAppSelector((state) => state.search.isShowTags);

  // ui event handlers
  const handleClick = () => {
    dispatch(SearchActions.toggleShowTags());
  };

  return (
    <Tooltip title="Show/hide tags">
      <IconButton onClick={handleClick} {...props}>
        {showTags ? <VisibilityIcon /> : <VisibilityOffIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ToggleShowTagsButton;