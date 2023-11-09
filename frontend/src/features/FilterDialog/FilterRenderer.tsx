import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TreeItem, TreeView } from "@mui/lab";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import {
  DBColumns,
  FilterExpression,
  IDOperator,
  LogicalOperator,
  NumberOperator,
  StringOperator,
} from "../../api/openapi";
import FilterExpressionRenderer from "./FilterExpressionRenderer";
import "./filter.css";
import {
  FilterOperatorType,
  MyFilter,
  MyFilterExpression,
  column2operator,
  deleteInFilter,
  findInFilter,
  getDefaultOperator,
  isFilter,
  isFilterExpression,
  metaType2operator,
} from "./filterUtils";

export interface FilterRendererProps {
  columns: DBColumns[];
  filter: MyFilter;
  onFilterChange: (newFilter: MyFilter) => void;
  defaultFilterExpression: FilterExpression;
}

function FilterRenderer({ columns, filter, onFilterChange, defaultFilterExpression }: FilterRendererProps) {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state (react-query)
  const projectMetadata = ProjectHooks.useGetMetadata(projectId);

  const dynamicColumns: { label: string; value: string }[] = useMemo(() => {
    let result = Object.values(columns).map((column) => ({ label: column as string, value: column as string }));
    if (!projectMetadata.data || !columns.includes(DBColumns.METADATA)) {
      return result;
    }

    if (columns.includes(DBColumns.METADATA)) {
      // remove metadata column
      result = result.filter((column) => column.label !== DBColumns.METADATA);
      projectMetadata.data.forEach((metadata) => {
        result.push({ label: `${metadata.doctype}-${metadata.key}`, value: metadata.id.toString() });
      });
    }

    return result;
  }, [columns, projectMetadata.data]);

  const dynamicColumnValue2Operator: Record<string, FilterOperatorType> = useMemo(() => {
    if (!projectMetadata.data) {
      return {};
    }

    return projectMetadata.data.reduce(
      (acc, metadata) => {
        acc[`${metadata.id}`] = metaType2operator[metadata.metatype];
        return acc;
      },
      { ...(column2operator as Record<string, FilterOperatorType>) },
    );
  }, [projectMetadata.data]);

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

  const handleColumnChange = (id: string, columnValue: string) => {
    const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(newFilter, id);
    if (filterItem && isFilterExpression(filterItem)) {
      if (Object.values<string>(DBColumns).includes(columnValue)) {
        // it is a DBColumn
        filterItem.column = columnValue as DBColumns;
      } else {
        // it is a Metadata column
        filterItem.column = DBColumns.METADATA;
        filterItem.project_metadata_id = parseInt(columnValue);
      }
      filterItem.operator = getDefaultOperator(dynamicColumnValue2Operator[columnValue]);
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
