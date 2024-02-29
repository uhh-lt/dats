import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { TreeItem, TreeView } from "@mui/x-tree-view";
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
  const handleAddFilter = (filterId: string) => {
    dispatch(filterActions.addDefaultFilter({ filterId }));
  };

  const handleAddFilterExpression = (filterId: string) => {
    dispatch(filterActions.addDefaultFilterExpression({ filterId }));
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

  const handleValueChange = (filterId: string, value: string | number | boolean | string[]) => {
    dispatch(filterActions.changeValue({ filterId, value }));
  };

  // rendering
  const renderFilter = (filter: MyFilter, disableDeleteButton: boolean) => {
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
        <TreeItem
          key={`${filter.id}-add`}
          nodeId={`${filter.id}-add`}
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
      </TreeItem>
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
      {renderFilter(editableFilter, true)}
    </TreeView>
  );
}

export default FilterRenderer;
