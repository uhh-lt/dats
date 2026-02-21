import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DoneIcon from "@mui/icons-material/Done";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Box, Button, ButtonProps, FormControlLabel, Popover, PopoverProps, Switch } from "@mui/material";
import { ChangeEvent, memo, useCallback } from "react";
import { useDialog } from "../../hooks/useDialog.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { FilterRenderer } from "./FilterRenderer/FilterRenderer.tsx";
import { FilterRendererSimple } from "./FilterRenderer/FilterRendererSimple.tsx";
import { FilterRendererProps } from "./FilterRenderer/types/FilterRendererProps.ts";
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

export const FilterDialog = memo((
  {
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
  }: FilterDialogProps & FilterRendererProps
) => {
  // local client state
  const dialog = useDialog();
  // global client state (redux)
  const numFilterExpressions = countFilterExpressions(filter);
  const dispatch = useAppDispatch();

  // actions
  const handleOpenEditDialog = useCallback(() => {
    dialog.open();
    dispatch(props.filterActions.onStartFilterEdit({ filterId: filterName }));
  }, [dispatch, filterName, props.filterActions, dialog]);

  const handleApplyChanges = useCallback(() => {
    dialog.close();
    dispatch(props.filterActions.onFinishFilterEdit());
  }, [dispatch, props.filterActions, dialog]);

  const handleRemoveAll = useCallback(() => {
    dispatch(props.filterActions.resetEditFilter());
  }, [dispatch, props.filterActions]);

  const handleExpertModeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChangeExpertMode(event.target.checked);
    },
    [onChangeExpertMode],
  );

  const handlePopoverClose = useCallback(() => {
    dialog.close();
  }, [dialog]);

  return (
    <>
      <Button startIcon={<FilterListIcon />} onClick={handleOpenEditDialog} {...buttonProps}>
        <b>Filter ({numFilterExpressions})</b>
      </Button>
      <Popover
        open={dialog.isOpen}
        onClose={handlePopoverClose}
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
            control={<Switch checked={expertMode} onChange={handleExpertModeChange} />}
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
});
