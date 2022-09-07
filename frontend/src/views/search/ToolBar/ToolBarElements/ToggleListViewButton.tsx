import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";
import { SearchActions } from "../../searchSlice";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";

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
    <Tooltip title="List view/Tile view">
      <IconButton onClick={handleClick} {...props}>
        {showList ? <ViewModuleIcon /> : <ViewListIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ToggleListViewButton;
