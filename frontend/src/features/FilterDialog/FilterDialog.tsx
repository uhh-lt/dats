import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Box, Button, Popover } from "@mui/material";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { DBColumns, FilterExpression } from "../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import FilterRenderer from "./FilterRenderer";
import { FilterActions, getFilterExpressionCount } from "./filterSlice";
import { useInitFilterDialog } from "./useInitFilterDialog";

interface FilterDialogProps {
  anchorEl: HTMLElement | null;
  columns: DBColumns[];
  defaultFilterExpression: FilterExpression;
}

function FilterDialog({ anchorEl, columns, defaultFilterExpression }: FilterDialogProps) {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // local client state
  const [open, setOpen] = useState(false);

  // global client state (redux)
  const numFilterExpressions = useAppSelector(getFilterExpressionCount);
  const dispatch = useAppDispatch();

  // custom hooks: initialize the filterSlice
  useInitFilterDialog({ projectId, columns, defaultFilterExpression });

  // actions
  const handleRemoveAll = () => {
    dispatch(FilterActions.resetFilter());
  };

  return (
    <>
      <Button startIcon={<FilterListIcon />} onClick={() => setOpen(true)}>
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
        <Box display="flex" justifyContent="flex-end" width="100%">
          <Button startIcon={<DeleteForeverIcon />} onClick={handleRemoveAll}>
            Remove All
          </Button>
        </Box>
      </Popover>
    </>
  );
}

export default FilterDialog;
