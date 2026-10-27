import { UserHooks, UserRenderer } from "@core/user";
import {
  FormControl,
  FormControlProps,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { memo, useCallback, useId } from "react";

interface AnnotatorSelectorProps extends Omit<FormControlProps, "onChange"> {
  userId: number | undefined;
  onUserIdChange: (userId: number) => void;
  title: string;
}

/** Selects one annotator among the users of the project. */
export const AnnotatorSelector = memo(({ userId, onUserIdChange, title, ...props }: AnnotatorSelectorProps) => {
  // global server state (react query)
  const projectUsers = UserHooks.useGetAllUsers();
  const labelId = useId();

  // handlers (for ui)
  const handleChange = useCallback(
    (event: SelectChangeEvent<number | "">) => {
      const value = event.target.value;
      if (value === "") return;
      onUserIdChange(Number(value));
    },
    [onUserIdChange],
  );

  return (
    <FormControl size="small" {...props}>
      <InputLabel id={labelId}>{title}</InputLabel>
      <Select
        labelId={labelId}
        label={title}
        value={projectUsers.isSuccess && userId !== undefined ? userId : ""}
        onChange={handleChange}
        disabled={!projectUsers.isSuccess}
        renderValue={(selected) => <UserRenderer user={selected} />}
      >
        {projectUsers.data?.map((user) => (
          <MenuItem key={user.id} value={user.id}>
            <ListItemText>
              <UserRenderer user={user} />
            </ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});
