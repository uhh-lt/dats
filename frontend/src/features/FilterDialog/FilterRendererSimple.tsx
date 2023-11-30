import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TreeItem, TreeView } from "@mui/lab";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { LogicalOperator } from "../../api/openapi";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import FilterExpressionRenderer from "./FilterExpressionRenderer";
import "./filter.css";
import { FilterActions } from "./filterSlice";
import { ColumnInfo, FilterOperators, MyFilter, MyFilterExpression, isFilter, isFilterExpression } from "./filterUtils";

export interface FilterRendererSimpleProps {
  editableFilter: MyFilter;
  filterActions: FilterActions;
  column2Info: Record<string, ColumnInfo>;
}

function FilterRendererSimple({ editableFilter, filterActions, column2Info }: FilterRendererSimpleProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions

  const handleAddFilterExpression = (filterId: string) => {
    dispatch(filterActions.addDefaultFilterExpression({ filterId, addEnd: true }));
  };

  const handleDeleteFilter = (filterId: string) => {
    dispatch(filterActions.deleteFilter({ filterId }));
  };

  const handleLogicalOperatorChange = (filterId: string, operator: LogicalOperator) => {
    dispatch(filterActions.changeLogicalOperator({ filterId, operator }));
  };

  const handleColumnChange = (filterId: string, columnValue: string) => {
    dispatch(filterActions.changeColumn({ filterId, columnValue }));
  };

  const handleOperatorChange = (filterId: string, operator: FilterOperators) => {
    dispatch(filterActions.changeOperator({ filterId, operator }));
  };

  const handleValueChange = (filterId: string, value: any) => {
    dispatch(filterActions.changeValue({ filterId, value }));
  };

  // rendering
  const renderFilters = (filters: (MyFilter | MyFilterExpression)[]) => {
    return (
      <>
        {filters.map((filter, index) => {
          if (isFilter(filter)) {
            return (
              <TreeItem
                key={filter.id}
                nodeId={filter.id}
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
    <TreeView
      className="filterTree"
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpanded={[editableFilter.id]}
      defaultExpandIcon={<ChevronRightIcon />}
      disableSelection
    >
      {renderFilters(editableFilter.items)}
      <TreeItem
        key={`filter-add`}
        nodeId={`filter-add`}
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
    </TreeView>
  );
}

export default FilterRendererSimple;
