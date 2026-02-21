import ClearIcon from "@mui/icons-material/Clear";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { TreeItem2 } from "@mui/x-tree-view";
import { forwardRef, memo, useCallback } from "react";
import { FilterValueSelector } from "../FilterValueSelector/FilterValueSelector.tsx";
import { ColumnInfo, FilterOperators, MyFilterExpression } from "../filterUtils.ts";
import { FilterColumnSelector } from "./components/FilterColumnSelector.tsx";
import { FilterOperatorSelector } from "./components/FilterOperatorSelector.tsx";

interface FilterExpressionRendererProps {
  filterExpression: MyFilterExpression;
  onDeleteFilter(id: string): void;
  onChangeColumn(filterId: string, columnValue: string): void;
  onChangeOperator(id: string, operator: FilterOperators): void;
  onChangeValue(id: string, value: string | number | boolean | string[]): void;
  column2Info: Record<string, ColumnInfo>;
}

const CustomContent = forwardRef<HTMLDivElement, FilterExpressionRendererProps>(
  ({ filterExpression, onDeleteFilter, onChangeColumn, onChangeOperator, onChangeValue, column2Info }, ref) => {
    const handleDeleteClick = useCallback(() => {
      onDeleteFilter(filterExpression.id);
    }, [onDeleteFilter, filterExpression.id]);

    return (
      <Stack direction="row" alignItems="end" py={1} pl={4} pr={1} ref={ref}>
        <Tooltip title="Delete Filter Expression">
          <span>
            <IconButton size="small" onClick={handleDeleteClick} sx={{ color: "inherit", mr: 1 }}>
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
  },
);

export const FilterExpressionRenderer = memo((props: FilterExpressionRendererProps) => {
  const handleClick = useCallback((event: React.MouseEvent<HTMLLIElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <TreeItem2
      key={props.filterExpression.id}
      itemId={props.filterExpression.id}
      onClick={handleClick}
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
});
