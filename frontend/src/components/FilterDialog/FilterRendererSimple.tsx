import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { TreeItem } from "@mui/x-tree-view";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { useCallback } from "react";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import FilterExpressionRenderer from "./FilterExpressionRenderer.tsx";
import "./filter.css";
import { FilterActions } from "./filterSlice.ts";
import {
  ColumnInfo,
  FilterOperators,
  MyFilter,
  MyFilterExpression,
  isFilter,
  isFilterExpression,
} from "./filterUtils.ts";
export interface FilterRendererSimpleProps {
  editableFilter: MyFilter;
  filterActions: FilterActions;
  column2Info: Record<string, ColumnInfo>;
}

function FilterRendererSimple({ editableFilter, filterActions, column2Info }: FilterRendererSimpleProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleAddFilterExpression = useCallback(
    (filterId: string) => {
      dispatch(filterActions.addDefaultFilterExpression({ filterId, addEnd: true }));
    },
    [dispatch, filterActions],
  );

  const handleDeleteFilter = useCallback(
    (filterId: string) => {
      dispatch(filterActions.deleteFilter({ filterId }));
    },
    [dispatch, filterActions],
  );

  const handleLogicalOperatorChange = useCallback(
    (filterId: string, operator: LogicalOperator) => {
      dispatch(filterActions.changeFilterLogicalOperator({ filterId, operator }));
    },
    [dispatch, filterActions],
  );

  const handleColumnChange = useCallback(
    (filterId: string, columnValue: string) => {
      dispatch(filterActions.changeFilterColumn({ filterId, columnValue }));
    },
    [dispatch, filterActions],
  );

  const handleOperatorChange = useCallback(
    (filterId: string, operator: FilterOperators) => {
      dispatch(filterActions.changeFilterOperator({ filterId, operator }));
    },
    [dispatch, filterActions],
  );

  const handleValueChange = useCallback(
    (filterId: string, value: string | number | boolean | string[]) => {
      dispatch(filterActions.changeFilterValue({ filterId, value }));
    },
    [dispatch, filterActions],
  );

  // rendering
  const renderFilters = (filters: (MyFilter | MyFilterExpression)[]) => {
    return (
      <>
        {filters.map((filter) => {
          if (isFilter(filter)) {
            return (
              <TreeItem
                key={filter.id}
                itemId={filter.id}
                label={
                  <Stack direction="row" alignItems="end" py={1}>
                    <Tooltip title="Delete Filter Group">
                      <span>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteFilter(filter.id);
                          }}
                          sx={{ color: "inherit", mr: 1 }}
                        >
                          <ClearIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <TextField
                      select
                      value={filter.logic_operator}
                      onChange={(event) =>
                        handleLogicalOperatorChange(filter.id, event.target.value as LogicalOperator)
                      }
                      label="Logical Operator"
                      variant="standard"
                      size="medium"
                      sx={{ width: 95 }}
                      onClick={(event) => event.stopPropagation()}
                      disabled
                    >
                      <MenuItem key={LogicalOperator.AND} value={LogicalOperator.AND}>
                        AND
                      </MenuItem>
                      <MenuItem key={LogicalOperator.OR} value={LogicalOperator.OR}>
                        OR
                      </MenuItem>
                    </TextField>
                  </Stack>
                }
              >
                {renderFilters(filter.items)}
              </TreeItem>
            );
          } else if (isFilterExpression(filter)) {
            return (
              <FilterExpressionRenderer
                key={filter.id}
                filterExpression={filter}
                onDeleteFilter={handleDeleteFilter}
                onChangeColumn={handleColumnChange}
                onChangeOperator={handleOperatorChange}
                onChangeValue={handleValueChange}
                column2Info={column2Info}
              />
            );
          } else {
            return null;
          }
        })}
      </>
    );
  };

  return (
    <SimpleTreeView
      key={editableFilter.id}
      className="filterTree"
      defaultExpandedItems={[editableFilter.id]}
      disableSelection
      slots={{
        expandIcon: ChevronRightIcon,
        collapseIcon: ExpandMoreIcon,
      }}
    >
      {renderFilters(editableFilter.items)}
      <TreeItem
        key={`filter-add`}
        itemId={`filter-add`}
        label={
          <Box>
            <Button
              startIcon={<AddIcon sx={{ ml: 0.5 }} />}
              onClick={() => handleAddFilterExpression(editableFilter.id)}
            >
              Add Filter Expression
            </Button>
          </Box>
        }
        className="filterExpression"
      />
    </SimpleTreeView>
  );
}

export default FilterRendererSimple;
