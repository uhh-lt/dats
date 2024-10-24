import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DoneIcon from "@mui/icons-material/Done";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Box, Button, ButtonProps, FormControlLabel, Popover, PopoverProps, Switch } from "@mui/material";
import { useState } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import FilterRenderer, { FilterRendererProps } from "./FilterRenderer.tsx";
import FilterRendererSimple from "./FilterRendererSimple.tsx";
import { MyFilter, countFilterExpressions } from "./filterUtils.ts";

export interface FilterDialogProps {
  anchorEl: HTMLElement | null;
  filter: MyFilter;
  filterName?: string;
  expertMode: boolean;
  onChangeExpertMode: (expertMode: boolean) => void;
  buttonProps?: Omit<ButtonProps, "onClick" | "startIcon">;
  anchorOrigin?: PopoverProps["anchorOrigin"];
  transformOrigin?: PopoverProps["transformOrigin"];
}

function FilterDialog({
  anchorEl,
  filter,
  expertMode,
  onChangeExpertMode,
  buttonProps,
  filterName = "root",
  anchorOrigin = {
    vertical: "top",
    horizontal: "left",
  },
  transformOrigin = {
    vertical: "top",
    horizontal: "left",
  },
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
    dispatch(props.filterActions.onStartFilterEdit({ filterId: filterName }));
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
      <Button startIcon={<FilterListIcon />} onClick={handleOpenEditDialog} {...buttonProps}>
        <b>Filter ({numFilterExpressions})</b>
      </Button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={anchorEl}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        slotProps={{
          paper: {
            sx: {
              width: "50%",
              p: 1,
            },
          },
        }}
      >
        {expertMode ? <FilterRenderer {...props} /> : <FilterRendererSimple {...props} />}
        <Box display="flex" width="100%">
          <FormControlLabel
            control={<Switch checked={expertMode} onChange={(event) => onChangeExpertMode(event.target.checked)} />}
            label="Expert filtering"
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
