import ClearIcon from "@mui/icons-material/Clear";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { TreeItem2 } from "@mui/x-tree-view";
import FilterColumnSelector from "./FilterColumnSelector.tsx";
import FilterOperatorSelector from "./FilterOperatorSelector.tsx";
import FilterValueSelector from "./FilterValueSelector.tsx";
import { ColumnInfo, FilterOperators, MyFilterExpression } from "./filterUtils.ts";

interface FilterExpressionRendererProps {
  filterExpression: MyFilterExpression;
  onDeleteFilter(id: string): void;
  onChangeColumn(filterId: string, columnValue: string): void;
  onChangeOperator(id: string, operator: FilterOperators): void;
  onChangeValue(id: string, value: string | number | boolean | string[]): void;
  column2Info: Record<string, ColumnInfo>;
}

function CustomContent({
  filterExpression,
  onDeleteFilter,
  onChangeColumn,
  onChangeOperator,
  onChangeValue,
  column2Info,
}: FilterExpressionRendererProps) {
  return (
    <Stack direction="row" alignItems="end" py={1} pl={4} pr={1}>
      <Tooltip title="Delete Filter Expression">
        <span>
          <IconButton size="small" onClick={() => onDeleteFilter(filterExpression.id)} sx={{ color: "inherit", mr: 1 }}>
            <ClearIcon />
          </IconButton>
        </span>
      </Tooltip>
      <FilterColumnSelector
        filterExpression={filterExpression}
        column2Info={column2Info}
        onChangeColumn={onChangeColumn}
      />
      <FilterOperatorSelector
        filterExpression={filterExpression}
        onChangeOperator={onChangeOperator}
        column2Info={column2Info}
      />
      <FilterValueSelector
        filterExpression={filterExpression}
        onChangeValue={onChangeValue}
        column2Info={column2Info}
      />
    </Stack>
  );
}

function FilterExpressionRenderer(props: FilterExpressionRendererProps) {
  return (
    <TreeItem2
      key={props.filterExpression.id}
      itemId={props.filterExpression.id}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="filterExpression"
      slots={{
        content: CustomContent,
      }}
      slotProps={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: props as any,
      }}
    />
  );
}

export default FilterExpressionRenderer;
