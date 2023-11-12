import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TreeItem, TreeView } from "@mui/lab";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { LogicalOperator } from "../../api/openapi";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import FilterExpressionRenderer from "./FilterExpressionRenderer";
import { useFilterSliceActions } from "./FilterProvider";
import "./filter.css";
import { FilterOperator, MyFilter, isFilter, isFilterExpression } from "./filterUtils";

export interface FilterRendererProps {
  filter: MyFilter;
}

function FilterRenderer({ filter }: FilterRendererProps) {
  // global client state (redux)
  const filterActions = useFilterSliceActions();
  const dispatch = useAppDispatch();

  const rootFilterId = filter.id;

  // actions
  const handleAddFilter = (filterId: string) => {
    dispatch(filterActions.addDefaultFilter({ filterId, rootFilterId }));
  };

  const handleAddFilterExpression = (filterId: string) => {
    dispatch(filterActions.addDefaultFilterExpression({ filterId, rootFilterId }));
  };

  const handleDeleteFilter = (filterId: string) => {
    dispatch(filterActions.deleteFilter({ filterId, rootFilterId }));
  };

  const handleLogicalOperatorChange = (filterId: string, operator: LogicalOperator) => {
    dispatch(filterActions.changeLogicalOperator({ filterId, operator, rootFilterId }));
  };

  const handleColumnChange = (filterId: string, columnValue: string) => {
    dispatch(filterActions.changeColumn({ filterId, columnValue, rootFilterId }));
  };

  const handleOperatorChange = (filterId: string, operator: FilterOperator) => {
    dispatch(filterActions.changeOperator({ filterId, operator, rootFilterId }));
  };

  const handleValueChange = (filterId: string, value: any) => {
    dispatch(filterActions.changeValue({ filterId, value, rootFilterId }));
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
        {filter.items.map((item, index) => {
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
      defaultExpanded={[filter.id]}
      defaultExpandIcon={<ChevronRightIcon />}
      disableSelection
    >
      {renderFilter(filter, true)}
    </TreeView>
  );
}

export default FilterRenderer;
