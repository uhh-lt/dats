import {
  AppBar,
  AppBarProps,
  Checkbox,
  FormControl,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Toolbar,
} from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useEffect } from "react";
import ProjectHooks from "../../api/ProjectHooks";
import { useAuth } from "../../auth/AuthProvider";
import UserName from "../../components/UserName";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { AnalysisActions } from "./analysisSlice";

interface AnnotationDocumentSelectorProps {
  projectId: number | undefined;
}

export function UserSelector({ projectId, ...props }: AnnotationDocumentSelectorProps & AppBarProps) {
  // global client state (context)
  const { user } = useAuth();

  // global client state (redux)
  const dispatch = useAppDispatch();
  const selectedUserIds = useAppSelector((state) => state.analysis.selectedUserIds);

  // global server state (react query)
  const projectUsers = ProjectHooks.useGetAllUsers(projectId);

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number[]>) => {
    dispatch(AnalysisActions.setSelectedUserIds(event.target.value as number[]));
  };

  // init
  useEffect(() => {
    if (user.data && selectedUserIds === undefined) {
      dispatch(AnalysisActions.setSelectedUserIds([user.data.id]));
    }
  }, [selectedUserIds, dispatch, user.data]);

  // render
  return (
    <AppBar
      position="relative"
      variant="outlined"
      elevation={0}
      sx={{
        backgroundColor: (theme) => theme.palette.background.paper,
        color: (theme) => theme.palette.text.primary,
        borderRadius: 1,
        ...props.sx,
      }}
      {...props}
    >
      <Toolbar variant="dense">
        <FormControl size="small" fullWidth>
          <Stack direction="row" sx={{ width: "100%", alignItems: "center" }}>
            <Typography variant="body1" color="inherit" component="div" className="overflow-ellipsis" flexShrink={0}>
              Annotations
            </Typography>
            <Select
              sx={{ ml: 1, backgroundColor: "white" }}
              multiple
              fullWidth
              value={selectedUserIds || []}
              onChange={handleChange}
              disabled={!projectUsers.isSuccess}
              renderValue={(selected) =>
                selected.map((x, index) => (
                  <React.Fragment key={x}>
                    <UserName userId={x} />
                    {index < selected.length - 1 && ", "}
                  </React.Fragment>
                ))
              }
            >
              {projectUsers.isSuccess &&
                projectUsers.data.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Checkbox checked={selectedUserIds?.indexOf(user.id) !== -1} />
                    <ListItemText>
                      <UserName userId={user.id} />
                    </ListItemText>
                  </MenuItem>
                ))}
            </Select>
          </Stack>
        </FormControl>
      </Toolbar>
    </AppBar>
  );
}
