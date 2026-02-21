import { Autocomplete, Button, ButtonGroup, Chip, TextField } from "@mui/material";
import { ChangeEvent, KeyboardEvent, SyntheticEvent, memo, useCallback } from "react";
import { FilterOperator } from "../../../../api/openapi/models/FilterOperator.ts";
import { dateToLocaleYYYYMMDDString, isValidDateString } from "../../../../utils/DateUtils.ts";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps.ts";

interface DefaultValueSelectorProps extends SharedFilterValueSelectorProps {
  operator: FilterOperator;
}

const DefaultValueSelector = memo(({ filterExpression, onChangeValue, operator }: DefaultValueSelectorProps) => {
  const handleEventStopPropagation = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const handleNumberChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChangeValue(filterExpression.id, parseInt(event.target.value));
    },
    [filterExpression.id, onChangeValue],
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChangeValue(filterExpression.id, event.target.value);
    },
    [filterExpression.id, onChangeValue],
  );

  const handleDateChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChangeValue(filterExpression.id, event.target.value);
    },
    [filterExpression.id, onChangeValue],
  );

  const handleBooleanFalseClick = useCallback(() => {
    onChangeValue(filterExpression.id, false);
  }, [filterExpression.id, onChangeValue]);

  const handleBooleanTrueClick = useCallback(() => {
    onChangeValue(filterExpression.id, true);
  }, [filterExpression.id, onChangeValue]);

  const handleAutocompleteChange = useCallback(
    (_event: SyntheticEvent, newValue: string[]) => {
      onChangeValue(filterExpression.id, newValue);
    },
    [filterExpression.id, onChangeValue],
  );

  switch (operator) {
    case FilterOperator.ID:
    case FilterOperator.NUMBER:
      return (
        <TextField
          type="number"
          value={typeof filterExpression.value === "number" ? filterExpression.value : 0}
          onChange={handleNumberChange}
          label="Value"
          variant="standard"
          fullWidth
          onKeyDown={handleEventStopPropagation}
        />
      );
    case FilterOperator.STRING:
      return (
        <TextField
          type="text"
          value={typeof filterExpression.value === "string" ? filterExpression.value : ""}
          onChange={handleTextChange}
          label="Value"
          variant="standard"
          fullWidth
          onKeyDown={handleEventStopPropagation}
        />
      );
    case FilterOperator.ID_LIST:
      return <>Not Implemented!</>;
    case FilterOperator.LIST:
      return (
        <Autocomplete
          value={Array.isArray(filterExpression.value) ? (filterExpression.value as string[]) : []}
          onChange={handleAutocompleteChange}
          fullWidth
          multiple
          options={[]}
          freeSolo
          disableClearable
          renderTags={(value: readonly string[], getTagProps) =>
            value.map((option: string, index: number) => (
              <Chip
                {...getTagProps({ index })}
                key={index}
                style={{ borderRadius: "4px", height: "100%" }}
                variant="filled"
                label={option}
              />
            ))
          }
          renderInput={(params) => <TextField {...params} fullWidth variant="standard" />}
          onKeyDown={handleEventStopPropagation}
        />
      );
    case FilterOperator.DATE:
      return (
        <TextField
          variant="standard"
          type="date"
          value={
            typeof filterExpression.value === "string" && isValidDateString(filterExpression.value)
              ? filterExpression.value
              : dateToLocaleYYYYMMDDString(new Date())
          }
          onChange={handleDateChange}
          fullWidth
          onKeyDown={handleEventStopPropagation}
        />
      );
    case FilterOperator.BOOLEAN: {
      const value = typeof filterExpression.value === "boolean" ? filterExpression.value : false;
      return (
        <ButtonGroup>
          <Button variant={value === false ? "contained" : undefined} onClick={handleBooleanFalseClick}>
            False
          </Button>
          <Button variant={value === true ? "contained" : undefined} onClick={handleBooleanTrueClick}>
            True
          </Button>
        </ButtonGroup>
      );
    }
    default:
      return <>Operator not supported</>;
  }
});
