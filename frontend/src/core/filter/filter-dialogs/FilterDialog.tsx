import { LogicalOperator } from "@api/models/LogicalOperator";
import { useDialog } from "@hooks/useDialog";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DoneIcon from "@mui/icons-material/Done";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Box, Button, ButtonProps, FormControlLabel, Popover, PopoverProps, Switch } from "@mui/material";
import { ChangeEvent, memo, useCallback, useState } from "react";
import { FilterRendererHandlers } from "../_types/FilterRendererProps";
import { FilterRenderer, FilterRendererSimple } from "../filter-renderer";
import { ColumnInfo, countFilterExpressions, FilterOperators, MyFilter, MyFilterExpression } from "../filterUtils";
import {
  addDefaultFilter,
  addDefaultFilterExpression,
  changeFilterColumn,
  changeFilterLogicalOperator,
  changeFilterOperator,
  changeFilterValue,
  deleteFilterItem,
  resetFilter,
  withDefaultFilterExpression,
} from "../store";

export interface InternalFilterDialogProps {
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

const InternalFilterDialog = memo(
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
  }: InternalFilterDialogProps & FilterRendererHandlers) => {
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

export interface FilterDialogProps<T extends string = string> {
  filterName: string;
  defaultFilterExpression: MyFilterExpression;
  filter: MyFilter<T>;
  onFilterChange: (filter: MyFilter<T>) => void;
  expertMode: boolean;
  onExpertModeChange: (expertMode: boolean) => void;
  column2Info: Record<string, ColumnInfo>;
}

function FilterDialogInner<T extends string = string>({
  filterName,
  defaultFilterExpression,
  filter,
  onFilterChange,
  expertMode,
  onExpertModeChange,
  column2Info,
  // ----
  anchorEl,
  buttonProps,
  anchorOrigin,
  transformOrigin,
}: FilterDialogProps<T> &
  Pick<InternalFilterDialogProps, "anchorEl" | "buttonProps" | "transformOrigin" | "anchorOrigin">) {
  const [editableFilter, setEditableFilter] = useState(filter);
  const typedDefaultFilterExpression = defaultFilterExpression as MyFilterExpression<T>;

  // filter actions
  const handleStartFilterEdit = useCallback(() => {
    setEditableFilter(withDefaultFilterExpression<T>(filter, typedDefaultFilterExpression));
  }, [filter, typedDefaultFilterExpression]);

  const handleFinishFilterEdit = useCallback(() => {
    onFilterChange(editableFilter);
  }, [editableFilter, onFilterChange]);

  const handleResetEditFilter = useCallback(() => {
    setEditableFilter((prev) => resetFilter(prev));
  }, []);

  const handleAddFilter = useCallback((filterId: string) => {
    setEditableFilter((prev) => addDefaultFilter(prev, filterId));
  }, []);

  const handleAddFilterExpression = useCallback(
    (filterId: string) => {
      setEditableFilter((prev) => addDefaultFilterExpression<T>(prev, filterId, typedDefaultFilterExpression));
    },
    [typedDefaultFilterExpression],
  );

  const handleDeleteFilter = useCallback((filterId: string) => {
    setEditableFilter((prev) => deleteFilterItem(prev, filterId));
  }, []);

  const handleChangeFilterLogicalOperator = useCallback((filterId: string, operator: LogicalOperator) => {
    setEditableFilter((prev) => changeFilterLogicalOperator(prev, filterId, operator));
  }, []);

  const handleChangeFilterColumn = useCallback(
    (filterId: string, columnValue: string) => {
      setEditableFilter((prev) => changeFilterColumn(prev, filterId, columnValue, column2Info));
    },
    [column2Info],
  );

  const handleChangeFilterOperator = useCallback((filterId: string, operator: FilterOperators) => {
    setEditableFilter((prev) => changeFilterOperator(prev, filterId, operator));
  }, []);

  const handleChangeFilterValue = useCallback((filterId: string, value: string | number | boolean | string[]) => {
    setEditableFilter((prev) => changeFilterValue(prev, filterId, value));
  }, []);

  return (
    <InternalFilterDialog
      anchorEl={anchorEl}
      buttonProps={buttonProps}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      filter={filter}
      filterName={filterName}
      editableFilter={editableFilter}
      expertMode={expertMode}
      column2Info={column2Info}
      onStartFilterEdit={handleStartFilterEdit}
      onFinishFilterEdit={handleFinishFilterEdit}
      onResetEditFilter={handleResetEditFilter}
      onChangeExpertMode={onExpertModeChange}
      onAddFilter={handleAddFilter}
      onAddFilterExpression={handleAddFilterExpression}
      onDeleteFilter={handleDeleteFilter}
      onChangeFilterLogicalOperator={handleChangeFilterLogicalOperator}
      onChangeFilterColumn={handleChangeFilterColumn}
      onChangeFilterOperator={handleChangeFilterOperator}
      onChangeFilterValue={handleChangeFilterValue}
    />
  );
}

export const FilterDialog = memo(FilterDialogInner) as typeof FilterDialogInner;
