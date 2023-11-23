import { Autocomplete, Chip, MenuItem, Switch, TextField } from "@mui/material";
import { useState } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import { DocType, FilterOperator, FilterValueType } from "../../api/openapi";
import CodeRenderer from "../../components/DataGrid/CodeRenderer";
import TagRenderer from "../../components/DataGrid/TagRenderer";
import UserRenderer from "../../components/DataGrid/UserRenderer";
import { isValidDateString } from "../../utils/DateUtils";
import { ColumnInfo, MyFilterExpression } from "./filterUtils";
import { docTypeToIcon } from "../DocumentExplorer/docTypeToIcon";

interface SharedFilterValueSelectorProps {
  filterExpression: MyFilterExpression;
  onChangeValue(id: string, value: string | number | boolean | string[]): void;
}

interface FilterValueSelectorProps extends SharedFilterValueSelectorProps {
  column2Info: Record<string, ColumnInfo>;
}

function FilterValueSelector({ filterExpression, onChangeValue, column2Info }: FilterValueSelectorProps) {
  const filterInfo = column2Info[filterExpression.column];

  switch (filterInfo.value) {
    case FilterValueType.TAG_ID:
      return <TagIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case FilterValueType.CODE_ID:
      return <CodeIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case FilterValueType.USER_ID:
      return <UserIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case FilterValueType.SPAN_ANNOTATION:
      return <SpanAnnotationValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case FilterValueType.DOC_TYPE:
      return <DocTypeValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case FilterValueType.INFER_FROM_OPERATOR:
      switch (filterInfo.operator) {
        case FilterOperator.ID:
        case FilterOperator.NUMBER:
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
        case FilterOperator.STRING:
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
        case FilterOperator.ID_LIST:
          return <>Not Implemented!</>;
        case FilterOperator.LIST:
          return (
            <Autocomplete
              value={Array.isArray(filterExpression.value) ? (filterExpression.value as string[]) : []}
              onChange={(event, newValue) => {
                onChangeValue(filterExpression.id, newValue);
              }}
              fullWidth
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
        case FilterOperator.DATE:
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
        case FilterOperator.BOOLEAN:
          return (
            <Switch
              checked={typeof filterExpression.value === "boolean" ? filterExpression.value : false}
              onChange={(e) => onChangeValue(filterExpression.id, e.target.checked)}
            />
          );
      }
      break;
    default:
      return <>FilterValueType not supported</>;
  }
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

function SpanAnnotationValueSelector({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state (react-query)
  const projectCodes = ProjectHooks.useGetAllCodes(projectId);

  const [value, setValue] = useState<string[]>(
    Array.isArray(filterExpression.value) ? filterExpression.value : ["-1", ""],
  );

  const handleCodeValueChange = (codeId: string) => {
    const newValue = [codeId, value[1]];
    setValue(newValue);
    onChangeValue(filterExpression.id, newValue);
  };

  const handleTextValueChange = (text: string) => {
    const newValue = [value[0], text];
    setValue(newValue);
    onChangeValue(filterExpression.id, newValue);
  };

  return (
    <>
      <TextField
        key={filterExpression.id}
        fullWidth
        select
        label="Code"
        variant="filled"
        value={value[0]}
        onChange={(event) => handleCodeValueChange(event.target.value)}
        InputLabelProps={{ shrink: true }}
      >
        <MenuItem key={"-1"} value={"-1"}>
          <i>None</i>
        </MenuItem>
        {projectCodes.data?.map((code) => (
          <MenuItem key={code.id} value={code.id.toString()}>
            <CodeRenderer code={code} />
          </MenuItem>
        ))}
      </TextField>
      <TextField
        type="text"
        value={value[1]}
        onChange={(event) => handleTextValueChange(event.target.value)}
        label="Text"
        variant="standard"
        fullWidth
      />
    </>
  );
}

function DocTypeValueSelector({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) {
  return (
    <TextField
      key={filterExpression.id}
      fullWidth
      select
      label="Value"
      variant="filled"
      value={filterExpression.value === "" ? "none" : filterExpression.value}
      onChange={(event) => onChangeValue(filterExpression.id, event.target.value)}
      InputLabelProps={{ shrink: true }}
      inputProps={{ sx: { display: "flex", flexDirection: "row", alignItems: "center" } }}
    >
      <MenuItem key={"none"} value={"none"}>
        <i>None</i>
      </MenuItem>
      {Object.values(DocType).map((docType) => (
        <MenuItem key={docType} value={docType}>
          {docTypeToIcon[docType]}
          {docType}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default FilterValueSelector;
