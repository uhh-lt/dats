import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TreeItem, TreeView } from "@mui/lab";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  DBColumns,
  FilterExpression,
  IDOperator,
  LogicalOperator,
  NumberOperator,
  StringOperator,
} from "../../api/openapi";
import "./filter.css";
import {
  MyFilter,
  MyFilterExpression,
  column2defaultOperator,
  column2operator,
  deleteInFilter,
  findInFilter,
  isFilter,
  isFilterExpression,
} from "./filterUtils";

function FilterColumnSelector({
  filterExpression,
  columns,
  onChangeColumn,
}: {
  filterExpression: MyFilterExpression;
  columns: DBColumns[];
  onChangeColumn(id: string, column: DBColumns): void;
}) {
  return (
    <TextField
      select
      value={filterExpression.column}
      onChange={(event) => onChangeColumn(filterExpression.id, event.target.value as DBColumns)}
      label="Column"
      variant="standard"
      fullWidth
    >
      {columns.map((column) => (
        <MenuItem key={column} value={column}>
          {column}
        </MenuItem>
      ))}
    </TextField>
  );
}

function FilterOperatorSelector({
  filterExpression,
  onChangeOperator,
}: {
  filterExpression: MyFilterExpression;
  onChangeOperator(id: string, operator: IDOperator | NumberOperator | StringOperator): void;
}) {
  const operator = column2operator[filterExpression.column];

  return (
    <TextField
      select
      value={filterExpression.operator}
      onChange={(event) =>
        onChangeOperator(filterExpression.id, event.target.value as IDOperator | NumberOperator | StringOperator)
      }
      label="Operator"
      variant="standard"
      fullWidth
    >
      {Object.keys(operator).map((op) => (
        <MenuItem key={op} value={op}>
          {op}
        </MenuItem>
      ))}
    </TextField>
  );
}

function FilterExpressionRenderer({
  filterExpression,
  columns,
  onDeleteFilter,
  onChangeColumn,
  onChangeOperator,
  onChangeValue,
}: {
  filterExpression: MyFilterExpression;
  columns: DBColumns[];
  onDeleteFilter(id: string): void;
  onChangeColumn(id: string, column: DBColumns): void;
  onChangeOperator(id: string, operator: IDOperator | NumberOperator | StringOperator): void;
  onChangeValue(id: string, value: string | number): void;
}) {
  return (
    <TreeItem
      key={filterExpression.id}
      nodeId={filterExpression.id}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="filterExpression"
      label={
        <Stack direction="row" alignItems="end" py={1}>
          <Tooltip title="Delete Filter Expression">
            <span>
              <IconButton
                size="small"
                onClick={() => onDeleteFilter(filterExpression.id)}
                sx={{ color: "inherit", mr: 1 }}
              >
                <ClearIcon />
              </IconButton>
            </span>
          </Tooltip>
          <FilterColumnSelector filterExpression={filterExpression} columns={columns} onChangeColumn={onChangeColumn} />
          <FilterOperatorSelector filterExpression={filterExpression} onChangeOperator={onChangeOperator} />
          <TextField
            type={typeof filterExpression.value}
            value={filterExpression.value}
            onChange={(event) => onChangeValue(filterExpression.id, event.target.value)}
            label="Value"
            variant="standard"
            fullWidth
          />
        </Stack>
      }
    />
  );
}

export interface FilterRendererProps {
  columns: DBColumns[];
  filter: MyFilter;
  onFilterChange: (newFilter: MyFilter) => void;
  defaultFilterExpression: FilterExpression;
}

function FilterRenderer({ columns, filter, onFilterChange, defaultFilterExpression }: FilterRendererProps) {
  // actions
  const handleAddFilter = (id: string) => {
    const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(newFilter, id);
    if (filterItem && isFilter(filterItem)) {
      filterItem.items = [
        {
          id: `${Date.now()}`,
          items: [],
          logic_operator: LogicalOperator.AND,
        } as MyFilter,
        ...filterItem.items,
      ];
    }
    onFilterChange(newFilter);
  };

  const handleAddFilterExpression = (id: string) => {
    const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(newFilter, id);
    if (filterItem && isFilter(filterItem)) {
      filterItem.items = [
        {
          ...defaultFilterExpression,
          id: `${Date.now()}`,
        } as MyFilterExpression,
        ...filterItem.items,
      ];
    }
    onFilterChange(newFilter);
  };

  const handleDeleteFilter = (id: string) => {
    onFilterChange(deleteInFilter(filter, id));
  };

  const handleLogicalOperatorChange = (id: string, operator: LogicalOperator) => {
    const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(newFilter, id);
    if (filterItem && isFilter(filterItem)) {
      filterItem.logic_operator = operator;
    }
    onFilterChange(newFilter);
  };

  const handleColumnChange = (id: string, column: DBColumns) => {
    const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(newFilter, id);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.column = column;
      filterItem.operator = column2defaultOperator[column];
      filterItem.value = "";
    }
    onFilterChange(newFilter);
  };

  const handleOperatorChange = (id: string, operator: IDOperator | NumberOperator | StringOperator) => {
    const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(newFilter, id);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.operator = operator;
    }
    onFilterChange(newFilter);
  };

  const handleValueChange = (id: string, value: string | number) => {
    const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(newFilter, id);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.value = value;
    }
    onFilterChange(newFilter);
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
                columns={columns}
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
