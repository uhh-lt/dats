import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import ReorderIcon from "@mui/icons-material/Reorder";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../searchSlice.ts";

interface ToggleSplitViewButtonProps {}

function ToggleSplitViewButton({ ...props }: ToggleSplitViewButtonProps & IconButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const isSplitView = useAppSelector((state) => state.search.isSplitView);

  // ui event handlers
  const handleClick = () => {
    dispatch(SearchActions.toggleSplitView());
  };

  return (
    <Tooltip title="Split/not split view">
      <IconButton onClick={handleClick} {...props}>
        {isSplitView ? <ReorderIcon /> : <VerticalSplitIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ToggleSplitViewButton;
