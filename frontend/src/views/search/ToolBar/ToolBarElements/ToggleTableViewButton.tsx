import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import { SearchActions } from "../../searchSlice";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";
import { IconButtonProps } from "@mui/material";
import TableViewIcon from "@mui/icons-material/TableView";

interface ToggleTableViewProps {}

function ToggleTableView({ ...props }: ToggleTableViewProps & IconButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const showTableView = useAppSelector((state) => state.search.isTableView);

  // ui event handlers
  const handleClick = () => {
    dispatch(SearchActions.onToggleTableView());
  };

  return (
    <Tooltip title="Table/Card view">
      <IconButton onClick={handleClick} {...props}>
        {showTableView ? <TableViewIcon /> : <TableViewIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ToggleTableView;
