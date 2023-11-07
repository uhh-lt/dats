import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TreeItem, TreeView } from "@mui/lab";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import {
  DBColumns,
  DocType,
  FilterExpression,
  IDOperator,
  LogicalOperator,
  NumberOperator,
  StringOperator,
} from "../../api/openapi";
import "./filter.css";
import {
  FilterOperatorType,
  MyFilter,
  MyFilterExpression,
  column2operator,
  deleteInFilter,
  findInFilter,
  isFilter,
  isFilterExpression,
  metaType2operator,
  getDefaultOperator,
} from "./filterUtils";
import FilterExpressionRenderer from "./FilterExpressionRenderer";
import ProjectHooks from "../../api/ProjectHooks";
import { useParams } from "react-router-dom";
import { useMemo } from "react";

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

  const dynamicColumns: string[] = useMemo(() => {
    if (!projectMetadata.data || !columns.includes(DBColumns.METADATA)) {
      return Object.keys(columns);
    }

    const dynamicColumns = Object.values(columns) as string[];
    projectMetadata.data.forEach((metadata) => {
      dynamicColumns.push(`META-${metadata.doctype}-${metadata.key}`);
    });
    return dynamicColumns;
  }, [columns, projectMetadata.data]);

  const dynamicColumn2Operator: Record<string, FilterOperatorType> = useMemo(() => {
    if (!projectMetadata.data) {
      return {};
    }

    return projectMetadata.data.reduce(
      (acc, metadata) => {
        acc[`META-${metadata.doctype}-${metadata.key}`] = metaType2operator[metadata.metatype];
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

  const handleColumnChange = (id: string, column: string, metadataKey?: string, docType?: DocType) => {
    const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(newFilter, id);
    if (filterItem && isFilterExpression(filterItem)) {
      if (column.startsWith("META-")) {
        filterItem.column = DBColumns.METADATA;
        filterItem.metadata_key = metadataKey;
        filterItem.docType = docType;
      } else {
        filterItem.column = column as DBColumns;
      }
      filterItem.operator = getDefaultOperator(dynamicColumn2Operator[column]);
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
                columns2operator={dynamicColumn2Operator}
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
