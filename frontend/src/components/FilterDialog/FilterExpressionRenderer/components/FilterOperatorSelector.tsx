import { MenuItem, TextField } from "@mui/material";
import { ChangeEvent, memo, useCallback, useMemo } from "react";
import { BooleanOperator } from "../../../../api/openapi/models/BooleanOperator.ts";
import { DateOperator } from "../../../../api/openapi/models/DateOperator.ts";
import { IDListOperator } from "../../../../api/openapi/models/IDListOperator.ts";
import { IDOperator } from "../../../../api/openapi/models/IDOperator.ts";
import { ListOperator } from "../../../../api/openapi/models/ListOperator.ts";
import { NumberOperator } from "../../../../api/openapi/models/NumberOperator.ts";
import { StringOperator } from "../../../../api/openapi/models/StringOperator.ts";
import {
  ColumnInfo,
  FilterOperators,
  MyFilterExpression,
  filterOperator2FilterOperatorType,
} from "../../filterUtils.ts";

const operator2HumanReadable: Record<FilterOperators, string> = {
  [IDOperator.ID_EQUALS]: "=",
  [IDOperator.ID_NOT_EQUALS]: "!=",
  [NumberOperator.NUMBER_EQUALS]: "=",
  [NumberOperator.NUMBER_NOT_EQUALS]: "!=",
  [NumberOperator.NUMBER_GT]: ">",
  [NumberOperator.NUMBER_LT]: "<",
  [NumberOperator.NUMBER_GTE]: ">=",
  [NumberOperator.NUMBER_LTE]: "<=",
  [StringOperator.STRING_CONTAINS]: "contains",
  [StringOperator.STRING_EQUALS]: "equals",
  [StringOperator.STRING_NOT_EQUALS]: "not equals",
  [StringOperator.STRING_STARTS_WITH]: "starts with",
  [StringOperator.STRING_ENDS_WITH]: "ends with",
  [IDListOperator.ID_LIST_CONTAINS]: "contains",
  [IDListOperator.ID_LIST_NOT_CONTAINS]: "contains not",
  [ListOperator.LIST_CONTAINS]: "contains",
  [ListOperator.LIST_NOT_CONTAINS]: "contains not",
  [DateOperator.DATE_EQUALS]: "=",
  [DateOperator.DATE_GT]: ">",
  [DateOperator.DATE_LT]: "<",
  [DateOperator.DATE_GTE]: ">=",
  [DateOperator.DATE_LTE]: "<=",
  [BooleanOperator.BOOLEAN_EQUALS]: "is",
  [BooleanOperator.BOOLEAN_NOT_EQUALS]: "is not",
};

interface FilterOperatorSelectorProps {
  filterExpression: MyFilterExpression;
  onChangeOperator(id: string, operator: FilterOperators): void;
  column2Info: Record<string, ColumnInfo>;
}

export const FilterOperatorSelector = memo((
  { filterExpression, onChangeOperator, column2Info }: FilterOperatorSelectorProps
) => {
  const filterOperator = useMemo(
    () => column2Info[filterExpression.column].operator,
    [column2Info, filterExpression.column],
  );
  const filterOperatorType = useMemo(() => filterOperator2FilterOperatorType[filterOperator], [filterOperator]);

  const handleOperatorChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChangeOperator(filterExpression.id, event.target.value as FilterOperators);
    },
    [filterExpression.id, onChangeOperator],
  );

  return (
    <TextField
      select
      value={filterExpression.operator}
      onChange={handleOperatorChange}
      label="Operator"
      variant="standard"
      fullWidth
    >
      {Object.values(filterOperatorType).map((op) => (
        <MenuItem key={op} value={op}>
          {operator2HumanReadable[op as FilterOperators]}
        </MenuItem>
      ))}
    </TextField>
  );
});
