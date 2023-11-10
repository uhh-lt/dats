import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Box, Button, Popover } from "@mui/material";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import FilterRenderer, { FilterRendererProps } from "./FilterRenderer";
import { FilterActions, getFilterExpressionCount } from "./filterSlice";

interface FilterDialogProps extends FilterRendererProps {
  anchorEl: HTMLElement | null;
}

function FilterDialog({ anchorEl, ...props }: FilterDialogProps) {
  const [open, setOpen] = useState(false);

  // global client state (redux)
  const numFilterExpressions = useAppSelector(getFilterExpressionCount);
  const dispatch = useAppDispatch();

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
        <FilterRenderer {...props} />
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
