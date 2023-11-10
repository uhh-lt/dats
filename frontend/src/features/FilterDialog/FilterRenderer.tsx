import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TreeItem, TreeView } from "@mui/lab";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { useParams } from "react-router-dom";
import { DBColumns, FilterExpression, LogicalOperator } from "../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import FilterExpressionRenderer from "./FilterExpressionRenderer";
import "./filter.css";
import { FilterActions } from "./filterSlice";
import { FilterOperator, MyFilter, isFilter, isFilterExpression } from "./filterUtils";
import { useInitFilterDialog } from "./useInitFilterDialog";

export interface FilterRendererProps {
  columns: DBColumns[];
  defaultFilterExpression: FilterExpression;
}

function FilterRenderer({ columns, defaultFilterExpression }: FilterRendererProps) {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global client state (redux)
  const filter = useAppSelector((state) => state.filter.filter);
  const dynamicColumns = useAppSelector((state) => state.filter.columns);
  const dynamicColumnValue2Operator = useAppSelector((state) => state.filter.columnValue2Operator);
  const dispatch = useAppDispatch();

  // custom hooks: initialize the filterSlice
  useInitFilterDialog({ projectId, columns, defaultFilterExpression });

  // actions
  const handleAddFilter = (filterId: string) => {
    dispatch(FilterActions.addDefaultFilter({ filterId }));
  };

  const handleAddFilterExpression = (filterId: string) => {
    dispatch(FilterActions.addDefaultFilterExpression({ filterId }));
  };

  const handleDeleteFilter = (filterId: string) => {
    dispatch(FilterActions.deleteFilter({ filterId }));
  };

  const handleLogicalOperatorChange = (filterId: string, operator: LogicalOperator) => {
    dispatch(FilterActions.changeLogicalOperator({ filterId, operator }));
  };

  const handleColumnChange = (filterId: string, columnValue: string) => {
    dispatch(FilterActions.changeColumn({ filterId, columnValue }));
  };

  const handleOperatorChange = (filterId: string, operator: FilterOperator) => {
    dispatch(FilterActions.changeOperator({ filterId, operator }));
  };

  const handleValueChange = (filterId: string, value: any) => {
    dispatch(FilterActions.changeValue({ filterId, value }));
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
                columns={dynamicColumns}
                columnValue2operator={dynamicColumnValue2Operator}
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
