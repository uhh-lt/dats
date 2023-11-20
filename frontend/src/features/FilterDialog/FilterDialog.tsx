import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DoneIcon from "@mui/icons-material/Done";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Box, Button, FormControlLabel, Popover, Switch } from "@mui/material";
import { useState } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import FilterRenderer, { FilterRendererProps } from "./FilterRenderer";
import { MyFilter, countFilterExpressions } from "./filterUtils";
import FilterRendererSimple from "./FilterRendererSimple";

export interface FilterDialogProps {
  anchorEl: HTMLElement | null;
  filter: MyFilter;
  expertMode: boolean;
  onChangeExpertMode: (expertMode: boolean) => void;
}

function FilterDialog({
  anchorEl,
  filter,
  expertMode,
  onChangeExpertMode,
  ...props
}: FilterDialogProps & FilterRendererProps) {
  // local client state
  const [open, setOpen] = useState(false);

  // global client state (redux)
  const numFilterExpressions = countFilterExpressions(filter);
  const dispatch = useAppDispatch();

  // actions
  const handleOpenEditDialog = () => {
    setOpen(true);
    dispatch(props.filterActions.onStartFilterEdit({ rootFilterId: "root" }));
  };

  const handleApplyChanges = () => {
    setOpen(false);
    dispatch(props.filterActions.onFinishFilterEdit());
  };

  const handleRemoveAll = () => {
    dispatch(props.filterActions.resetEditFilter());
  };

  return (
    <>
      <Button startIcon={<FilterListIcon />} onClick={handleOpenEditDialog}>
        <b>Filter ({numFilterExpressions})</b>
      </Button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            width: "50%",
            p: 1,
          },
        }}
        sx={{ mt: "56px" }}
      >
        {expertMode ? <FilterRenderer {...props} /> : <FilterRendererSimple {...props} />}
        <Box display="flex" width="100%">
          <FormControlLabel
            control={<Switch checked={expertMode} onChange={(event) => onChangeExpertMode(event.target.checked)} />}
            label="Expert search"
            sx={{ ml: 0.25 }}
          />
          <Box flexGrow={1} />
          <Button startIcon={<DeleteForeverIcon />} onClick={handleRemoveAll} sx={{ mr: 3 }}>
            Remove All
          </Button>
          <Button startIcon={<DoneIcon />} onClick={handleApplyChanges} variant="contained" color="success">
            Apply filter
          </Button>
        </Box>
      </Popover>
    </>
  );
}

export default FilterDialog;
