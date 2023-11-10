import ClearIcon from "@mui/icons-material/Clear";
import { TreeItem } from "@mui/lab";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { DocType } from "../../api/openapi";
import { useAppSelector } from "../../plugins/ReduxHooks";
import FilterColumnSelector from "./FilterColumnSelector";
import FilterOperatorSelector from "./FilterOperatorSelector";
import FilterValueSelector from "./FilterValueSelector";
import { FilterOperator, MyFilterExpression } from "./filterUtils";

function FilterExpressionRenderer({
  filterExpression,
  onDeleteFilter,
  onChangeColumn,
  onChangeOperator,
  onChangeValue,
}: {
  filterExpression: MyFilterExpression;
  onDeleteFilter(id: string): void;
  onChangeColumn(id: string, column: string, metadataKey?: string, docType?: DocType): void;
  onChangeOperator(id: string, operator: FilterOperator): void;
  onChangeValue(id: string, value: string | number): void;
}) {
  // global client state (redux)
  const columns = useAppSelector((state) => state.filter.columns);
  const columnValue2operator = useAppSelector((state) => state.filter.columnValue2Operator);

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
          <FilterOperatorSelector
            filterExpression={filterExpression}
            onChangeOperator={onChangeOperator}
            columnValue2operator={columnValue2operator}
          />
          <FilterValueSelector
            filterExpression={filterExpression}
            onChangeValue={onChangeValue}
            columnValue2Operator={columnValue2operator}
          />
        </Stack>
      }
    />
  );
}

export default FilterExpressionRenderer;
