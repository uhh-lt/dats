import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Box, Button, Popover } from "@mui/material";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import { useFilterSliceActions, useFilterSliceSelector } from "./FilterProvider";
import FilterRenderer from "./FilterRenderer";
import { countFilterExpressions } from "./filterUtils";
import { useInitFilterSlice } from "./useInitFilterSlice";
import DoneIcon from "@mui/icons-material/Done";

interface FilterDialogProps {
  anchorEl: HTMLElement | null;
}

function FilterDialog({ anchorEl }: FilterDialogProps) {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // local client state
  const [open, setOpen] = useState(false);

  // global client state (redux)
  const filter = useFilterSliceSelector().filter["root"];
  const numFilterExpressions = countFilterExpressions(filter);
  const filterActions = useFilterSliceActions();
  const dispatch = useAppDispatch();

  // custom hooks: initialize the filterSlice
  useInitFilterSlice({ projectId });

  // actions
  const handleOpenEditDialog = () => {
    setOpen(true);
    dispatch(filterActions.onStartFilterEdit({ rootFilterId: "root" }));
  };

  const handleApplyChanges = () => {
    setOpen(false);
    dispatch(filterActions.onFinishFilterEdit());
  };

  const handleRemoveAll = () => {
    dispatch(filterActions.resetEditFilter());
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
        <FilterRenderer />
        <Box display="flex" width="100%">
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
