import { useDialog } from "@hooks/useDialog";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DoneIcon from "@mui/icons-material/Done";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Box, Button, ButtonProps, FormControlLabel, Popover, PopoverProps, Switch } from "@mui/material";
import { ChangeEvent, memo, useCallback } from "react";
import { FilterRendererHandlers } from "../../_types/FilterRendererProps";
import { FilterRenderer, FilterRendererSimple } from "../../filter-renderer";
import { ColumnInfo, countFilterExpressions, MyFilter } from "../../filterUtils";

export interface FilterDialogProps {
  anchorEl: HTMLElement | null;
  filter: MyFilter;
  filterName?: string;
  expertMode: boolean;
  onChangeExpertMode: (expertMode: boolean) => void;
  buttonProps?: Omit<ButtonProps, "onClick" | "startIcon">;
  anchorOrigin?: PopoverProps["anchorOrigin"];
  transformOrigin?: PopoverProps["transformOrigin"];
  editableFilter: MyFilter;
  column2Info: Record<string, ColumnInfo>;
  onStartFilterEdit: (filterName: string) => void;
  onFinishFilterEdit: () => void;
  onResetEditFilter: () => void;
}

export const FilterDialog = memo(
  ({
    anchorEl,
    filter,
    expertMode,
    onChangeExpertMode,
    onResetEditFilter,
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
  }: FilterDialogProps & FilterRendererHandlers) => {
    // local client state
    const dialog = useDialog();
    const numFilterExpressions = countFilterExpressions(filter);

    // actions
    const handleOpenEditDialog = useCallback(() => {
      dialog.open();
      props.onStartFilterEdit(filterName);
    }, [filterName, props, dialog]);

    const handleApplyChanges = useCallback(() => {
      dialog.close();
      props.onFinishFilterEdit();
    }, [props, dialog]);

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
          {expertMode ? (
            <FilterRenderer
              editableFilter={props.editableFilter}
              column2Info={props.column2Info}
              onAddFilter={props.onAddFilter}
              onAddFilterExpression={props.onAddFilterExpression}
              onDeleteFilter={props.onDeleteFilter}
              onChangeFilterLogicalOperator={props.onChangeFilterLogicalOperator}
              onChangeFilterColumn={props.onChangeFilterColumn}
              onChangeFilterOperator={props.onChangeFilterOperator}
              onChangeFilterValue={props.onChangeFilterValue}
            />
          ) : (
            <FilterRendererSimple
              editableFilter={props.editableFilter}
              column2Info={props.column2Info}
              onAddFilter={props.onAddFilter}
              onAddFilterExpression={props.onAddFilterExpression}
              onDeleteFilter={props.onDeleteFilter}
              onChangeFilterLogicalOperator={props.onChangeFilterLogicalOperator}
              onChangeFilterColumn={props.onChangeFilterColumn}
              onChangeFilterOperator={props.onChangeFilterOperator}
              onChangeFilterValue={props.onChangeFilterValue}
            />
          )}
          <Box display="flex" width="100%">
            <FormControlLabel
              control={<Switch checked={expertMode} onChange={handleExpertModeChange} />}
              label="Expert filtering"
              sx={{ ml: 0.25 }}
            />
            <Box flexGrow={1} />
            <Button startIcon={<DeleteForeverIcon />} onClick={onResetEditFilter} sx={{ mr: 3 }}>
              Remove All
            </Button>
            <Button startIcon={<DoneIcon />} onClick={handleApplyChanges} variant="contained" color="success">
              Apply filter
            </Button>
          </Box>
        </Popover>
      </>
    );
  },
);
