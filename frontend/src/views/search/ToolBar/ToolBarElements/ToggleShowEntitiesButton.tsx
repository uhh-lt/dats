import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { IconButtonProps } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../searchSlice.ts";

interface ToggleShowEntitiesButtonProps {}

function ToggleShowEntitiesButton({ ...props }: ToggleShowEntitiesButtonProps & IconButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const showEntities = useAppSelector((state) => state.search.isShowEntities);

  // ui event handlers
  const handleClick = () => {
    dispatch(SearchActions.toggleShowEntities());
  };

  return (
    <Tooltip title="Show/hide entities">
      <IconButton onClick={() => handleClick()} {...props}>
        {showEntities ? <VisibilityIcon /> : <VisibilityOffIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ToggleShowEntitiesButton;
