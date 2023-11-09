import { Autocomplete, Chip, MenuItem, Switch, TextField } from "@mui/material";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import {
  BooleanOperator,
  DBColumns,
  DateOperator,
  IDListOperator,
  IDOperator,
  ListOperator,
  NumberOperator,
  StringOperator,
} from "../../api/openapi";
import CodeRenderer from "../../components/DataGrid/CodeRenderer";
import TagRenderer from "../../components/DataGrid/TagRenderer";
import UserRenderer from "../../components/DataGrid/UserRenderer";
import {
  FilterOperatorType,
  MyFilterExpression,
  getFilterExpressionColumnValue,
  isValidDateString,
} from "./filterUtils";

interface SharedFilterValueSelectorProps {
  filterExpression: MyFilterExpression;
  onChangeValue(id: string, value: string | number | boolean | string[]): void;
}

interface FilterValueSelectorProps extends SharedFilterValueSelectorProps {
  columnValue2Operator: Record<string, FilterOperatorType>;
}

function FilterValueSelector({ filterExpression, onChangeValue, columnValue2Operator }: FilterValueSelectorProps) {
  switch (filterExpression.column) {
    case DBColumns.DOCUMENT_TAG_ID_LIST:
      return <TagIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case DBColumns.CODE_ID_LIST:
      return <CodeIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case DBColumns.USER_ID_LIST:
      return <UserIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
  }

  const filterExpressionOperator = columnValue2Operator[getFilterExpressionColumnValue(filterExpression)];

  switch (filterExpressionOperator) {
    case IDOperator:
    case NumberOperator:
      return (
        <TextField
          type="number"
          value={typeof filterExpression.value === "number" ? filterExpression.value : 0}
          onChange={(event) => onChangeValue(filterExpression.id, parseInt(event.target.value))}
          label="Value"
          variant="standard"
          fullWidth
        />
      );
    case StringOperator:
      return (
        <TextField
          type="text"
          value={typeof filterExpression.value === "string" ? filterExpression.value : ""}
          onChange={(event) => onChangeValue(filterExpression.id, event.target.value)}
          label="Value"
          variant="standard"
          fullWidth
        />
      );
    case IDListOperator:
      return <>Not Implemented!</>;
    case ListOperator:
      return (
        <Autocomplete
          value={Array.isArray(filterExpression.value) ? filterExpression.value : []}
          onChange={(event, newValue) => {
            onChangeValue(filterExpression.id, newValue);
          }}
          sx={{
            flexGrow: 1,
            flexBasis: 1,
          }}
          multiple
          options={[]}
          freeSolo
          disableClearable
          renderTags={(value: readonly string[], getTagProps) =>
            value.map((option: string, index: number) => (
              <Chip
                style={{ borderRadius: "4px", height: "100%" }}
                variant="filled"
                label={option}
                {...getTagProps({ index })}
              />
            ))
          }
          renderInput={(params) => <TextField {...params} fullWidth variant="standard" />}
        />
      );
    case DateOperator:
      return (
        <TextField
          variant="standard"
          type="date"
          value={
            typeof filterExpression.value === "string" && isValidDateString(filterExpression.value)
              ? filterExpression.value
              : new Date()
          }
          onChange={(e) => onChangeValue(filterExpression.id, e.target.value)}
        />
      );
    case BooleanOperator:
      return (
        <Switch
          checked={typeof filterExpression.value === "boolean" ? filterExpression.value : false}
          onChange={(e) => onChangeValue(filterExpression.id, e.target.checked)}
        />
      );
  }
  return <></>;
}

function TagIdValueSelector({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state (react-query)
  const projectTags = ProjectHooks.useGetAllTags(projectId);

  return (
    <TextField
      key={filterExpression.id}
      fullWidth
      select
      label="Value"
      variant="filled"
      defaultValue={
        typeof filterExpression.value === "string" ? parseInt(filterExpression.value) || -1 : filterExpression.value
      }
      onChange={(event) => onChangeValue(filterExpression.id, parseInt(event.target.value))}
      InputLabelProps={{ shrink: true }}
    >
      <MenuItem key={-1} value={-1}>
        <i>None</i>
      </MenuItem>
      {projectTags.data?.map((tag) => (
        <MenuItem key={tag.id} value={tag.id}>
          <TagRenderer tag={tag} />
        </MenuItem>
      ))}
    </TextField>
  );
}

function CodeIdValueSelector({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state (react-query)
  const projectCodes = ProjectHooks.useGetAllCodes(projectId);

  return (
    <TextField
      key={filterExpression.id}
      fullWidth
      select
      label="Value"
      variant="filled"
      defaultValue={
        typeof filterExpression.value === "string" ? parseInt(filterExpression.value) || -1 : filterExpression.value
      }
      onChange={(event) => onChangeValue(filterExpression.id, parseInt(event.target.value))}
      InputLabelProps={{ shrink: true }}
    >
      <MenuItem key={-1} value={-1}>
        <i>None</i>
      </MenuItem>
      {projectCodes.data?.map((code) => (
        <MenuItem key={code.id} value={code.id}>
          <CodeRenderer code={code} />
        </MenuItem>
      ))}
    </TextField>
  );
}

function UserIdValueSelector({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state (react-query)
  const projectUsers = ProjectHooks.useGetAllUsers(projectId);

  return (
    <TextField
      key={filterExpression.id}
      fullWidth
      select
      label="Value"
      variant="filled"
      defaultValue={
        typeof filterExpression.value === "string" ? parseInt(filterExpression.value) || -1 : filterExpression.value
      }
      onChange={(event) => onChangeValue(filterExpression.id, parseInt(event.target.value))}
      InputLabelProps={{ shrink: true }}
    >
      <MenuItem key={-1} value={-1}>
        <i>None</i>
      </MenuItem>
      {projectUsers.data?.map((user) => (
        <MenuItem key={user.id} value={user.id}>
          <UserRenderer user={user} />
        </MenuItem>
      ))}
    </TextField>
  );
}

export default FilterValueSelector;
