import ClearIcon from "@mui/icons-material/Clear";
import { TreeItem } from "@mui/lab";
import { IconButton, Stack, Tooltip } from "@mui/material";
import FilterColumnSelector from "./FilterColumnSelector";
import FilterOperatorSelector from "./FilterOperatorSelector";
import FilterValueSelector from "./FilterValueSelector";
import { ColumnInfo, FilterOperators, MyFilterExpression } from "./filterUtils";

function FilterExpressionRenderer({
  filterExpression,
  onDeleteFilter,
  onChangeColumn,
  onChangeOperator,
  onChangeValue,
  column2Info,
}: {
  filterExpression: MyFilterExpression;
  onDeleteFilter(id: string): void;
  onChangeColumn(filterId: string, columnValue: string): void;
  onChangeOperator(id: string, operator: FilterOperators): void;
  onChangeValue(id: string, value: string | number): void;
  column2Info: Record<string, ColumnInfo>;
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
      }
    />
  );
}

export default FilterExpressionRenderer;
