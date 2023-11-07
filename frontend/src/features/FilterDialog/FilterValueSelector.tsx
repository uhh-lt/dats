import { MenuItem, TextField } from "@mui/material";
import { MyFilterExpression, column2InputType } from "./filterUtils";
import { DBColumns } from "../../api/openapi";
import ProjectHooks from "../../api/ProjectHooks";
import { useParams } from "react-router-dom";
import TagRenderer from "../../components/DataGrid/TagRenderer";
import CodeRenderer from "../../components/DataGrid/CodeRenderer";
import UserRenderer from "../../components/DataGrid/UserRenderer";

interface FilterValueSelectorProps {
  filterExpression: MyFilterExpression;
  onChangeValue(id: string, value: string | number): void;
}

function FilterValueSelector({ filterExpression, onChangeValue }: FilterValueSelectorProps) {
  switch (filterExpression.column) {
    case DBColumns.DOCUMENT_TAG_ID_LIST:
      return <TagIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case DBColumns.CODE_ID_LIST:
      return <CodeIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case DBColumns.USER_ID_LIST:
      return <UserIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    default:
      return (
        <TextField
          type={column2InputType[filterExpression.column]}
          value={filterExpression.value}
          onChange={(event) => onChangeValue(filterExpression.id, event.target.value)}
          label="Value"
          variant="standard"
          fullWidth
        />
      );
  }
}

function TagIdValueSelector({ filterExpression, onChangeValue }: FilterValueSelectorProps) {
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

function CodeIdValueSelector({ filterExpression, onChangeValue }: FilterValueSelectorProps) {
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

function UserIdValueSelector({ filterExpression, onChangeValue }: FilterValueSelectorProps) {
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
