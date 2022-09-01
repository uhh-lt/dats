import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import ReorderIcon from "@mui/icons-material/Reorder";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";
import { SearchActions } from "../../searchSlice";

interface ToggleListViewButtonProps {}

function ToggleListViewButton({ ...props }: ToggleListViewButtonProps & IconButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const showList = useAppSelector((state) => state.search.isListView);

  // ui event handlers
  const handleClick = () => {
    dispatch(SearchActions.toggleListView());
  };

  return (
    <Tooltip title="Listenansicht/Kachelansicht">
      <IconButton onClick={handleClick} {...props}>
        {showList ? <ReorderIcon /> : <VerticalSplitIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ToggleListViewButton;
