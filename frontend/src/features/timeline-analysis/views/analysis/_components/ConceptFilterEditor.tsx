import { LogicalOperator } from "@api/models/LogicalOperator";
import {
  ColumnInfo,
  FilterOperators,
  FilterRenderer,
  MyFilter,
  MyFilterExpression,
  addDefaultFilter,
  addDefaultFilterExpression,
  changeFilterColumn,
  changeFilterLogicalOperator,
  changeFilterOperator,
  changeFilterValue,
  deleteFilterItem,
} from "@core/filter";
import { Box, Typography } from "@mui/material";
import { Dispatch, SetStateAction, useCallback } from "react";

interface ConceptFilterEditorProps {
  editableFilter: MyFilter;
  column2Info: Record<string, ColumnInfo>;
  defaultFilterExpression: MyFilterExpression;
  setEditableFilter: Dispatch<SetStateAction<MyFilter>>;
}

export function ConceptFilterEditor({
  editableFilter,
  column2Info,
  defaultFilterExpression,
  setEditableFilter,
}: ConceptFilterEditorProps) {
  const handleAddFilter = useCallback(
    (filterId: string) => {
      setEditableFilter((prev) => addDefaultFilter(prev, filterId));
    },
    [setEditableFilter],
  );

  const handleAddFilterExpression = useCallback(
    (filterId: string) => {
      setEditableFilter((prev) => addDefaultFilterExpression(prev, filterId, defaultFilterExpression));
    },
    [defaultFilterExpression, setEditableFilter],
  );

  const handleDeleteFilter = useCallback(
    (filterId: string) => {
      setEditableFilter((prev) => deleteFilterItem(prev, filterId));
    },
    [setEditableFilter],
  );

  const handleLogicalOperatorChange = useCallback(
    (filterId: string, operator: LogicalOperator) => {
      setEditableFilter((prev) => changeFilterLogicalOperator(prev, filterId, operator));
    },
    [setEditableFilter],
  );

  const handleColumnChange = useCallback(
    (filterId: string, columnValue: string) => {
      setEditableFilter((prev) => changeFilterColumn(prev, filterId, columnValue, column2Info));
    },
    [column2Info, setEditableFilter],
  );

  const handleOperatorChange = useCallback(
    (filterId: string, operator: FilterOperators) => {
      setEditableFilter((prev) => changeFilterOperator(prev, filterId, operator));
    },
    [setEditableFilter],
  );

  const handleValueChange = useCallback(
    (filterId: string, value: string | number | boolean | string[]) => {
      setEditableFilter((prev) => changeFilterValue(prev, filterId, value));
    },
    [setEditableFilter],
  );

  return (
    <Box>
      <Typography>Filter:</Typography>
      <FilterRenderer
        editableFilter={editableFilter}
        column2Info={column2Info}
        onAddFilter={handleAddFilter}
        onAddFilterExpression={handleAddFilterExpression}
        onDeleteFilter={handleDeleteFilter}
        onChangeFilterLogicalOperator={handleLogicalOperatorChange}
        onChangeFilterColumn={handleColumnChange}
        onChangeFilterOperator={handleOperatorChange}
        onChangeFilterValue={handleValueChange}
      />
    </Box>
  );
}
