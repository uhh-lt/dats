import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { TreeItem2 } from "@mui/x-tree-view";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { useCallback } from "react";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import FilterExpressionRenderer from "./FilterExpressionRenderer.tsx";
import "./filter.css";
import { FilterActions } from "./filterSlice.ts";
import { ColumnInfo, FilterOperators, MyFilter, isFilter, isFilterExpression } from "./filterUtils.ts";

export interface FilterRendererProps {
  editableFilter: MyFilter;
  filterActions: FilterActions;
  column2Info: Record<string, ColumnInfo>;
}

function FilterRenderer({ editableFilter, filterActions, column2Info }: FilterRendererProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleAddFilter = useCallback(
    (filterId: string) => {
      dispatch(filterActions.addDefaultFilter({ filterId }));
    },
    [dispatch, filterActions],
  );

  const handleAddFilterExpression = useCallback(
    (filterId: string) => {
      dispatch(filterActions.addDefaultFilterExpression({ filterId }));
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
  const renderFilter = (filter: MyFilter, disableDeleteButton: boolean) => {
    return (
      <TreeItem2
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
                  disabled={disableDeleteButton}
                >
                  <ClearIcon />
                </IconButton>
              </span>
            </Tooltip>
            <TextField
              select
              value={filter.logic_operator}
              onChange={(event) => handleLogicalOperatorChange(filter.id, event.target.value as LogicalOperator)}
              label="Logical Operator"
              variant="standard"
              size="medium"
              sx={{ width: 95 }}
              onClick={(event) => event.stopPropagation()}
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
        <TreeItem2
          key={`${filter.id}-add`}
          itemId={`${filter.id}-add`}
          label={
            <Box sx={{ pl: 4 }}>
              <Button startIcon={<AddIcon />} onClick={() => handleAddFilter(filter.id)}>
                Add Filter Group
              </Button>
              <Button startIcon={<AddIcon />} onClick={() => handleAddFilterExpression(filter.id)}>
                Add Filter Expression
              </Button>
            </Box>
          }
          className="filterExpression"
        />
        {filter.items.map((item) => {
          if (isFilter(item)) {
            return renderFilter(item, false);
          } else if (isFilterExpression(item)) {
            return (
              <FilterExpressionRenderer
                key={item.id}
                filterExpression={item}
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
      </TreeItem2>
    );
  };

  return (
    <SimpleTreeView
      key={editableFilter.id}
      className="filterTree"
      slots={{
        collapseIcon: ExpandMoreIcon,
        expandIcon: ChevronRightIcon,
      }}
      defaultExpandedItems={[editableFilter.id]}
      disableSelection
    >
      {renderFilter(editableFilter, true)}
    </SimpleTreeView>
  );
}

export default FilterRenderer;
