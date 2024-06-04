import { Add, Edit, Remove } from "@mui/icons-material";
import { ButtonGroup, Checkbox, IconButton, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useEffect } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { ActionTargetObjectType } from "../../api/openapi/models/ActionTargetObjectType.ts";
import { ActionType } from "../../api/openapi/models/ActionType.ts";
import { useAuth } from "../../auth/useAuth.ts";
import UserName from "../../components/User/UserName.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { AutologbookActions } from "./autologbookSlice.ts";
import { actionTarget2Title } from "./utils.ts";

const actionTargetValues = Object.values(ActionTargetObjectType);

interface ActionFiltersProps {
  projectId: number;
}

/**
 * The filter task bar on the top left of the Autologbook viewer.
 * Filter functions are applied in Autologbook.tsx
 */
export function ActionFilters({ projectId }: ActionFiltersProps) {
  const { user } = useAuth();

  // global server state (react-query)
  const users = ProjectHooks.useGetAllUsers(projectId);

  // global state (redux)
  const dispatch = useAppDispatch();
  const userIds = useAppSelector((state) => state.autologbook.userIds);
  const actionTypes = useAppSelector((state) => state.autologbook.actionTypes);
  const actionTargets = useAppSelector((state) => state.autologbook.actionTargets);

  // init userIds with logged in user
  useEffect(() => {
    if (user) {
      dispatch(AutologbookActions.setUserIds([user.id]));
    }
  }, [dispatch, user]);

  const handleUserIdsChange = (event: SelectChangeEvent<number[]>) => {
    dispatch(AutologbookActions.setUserIds(event.target.value as number[]));
  };

  const handleActionTargetsChange = (event: SelectChangeEvent<ActionTargetObjectType[]>) => {
    dispatch(AutologbookActions.setActionTargets(event.target.value as ActionTargetObjectType[]));
  };

  // render
  return (
    <>
      {users.isSuccess && (
        <>
          <Typography component="div" variant="h5" style={{ paddingTop: 10, paddingBottom: 14, paddingRight: 12 }}>
            Filters:
          </Typography>

          <Typography fontSize={18} color="inherit" component="div" sx={{ mr: 1 }}>
            Users:
          </Typography>
          <Select
            size="small"
            sx={{ backgroundColor: "white", mr: 1, maxWidth: 300, overflow: "hidden" }}
            multiple
            value={userIds}
            onChange={handleUserIdsChange}
            renderValue={() => (
              <>
                {users.data
                  .filter((x) => userIds.includes(x.id))
                  .map((x, index) => (
                    <React.Fragment key={x.id}>
                      <UserName userId={x.id} />
                      {index < userIds.length - 1 && ", "}
                    </React.Fragment>
                  ))}
              </>
            )}
          >
            {users.data.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                <Checkbox checked={userIds.includes(user.id)} />
                <ListItemText>
                  <UserName userId={user.id} />
                </ListItemText>
              </MenuItem>
            ))}
          </Select>

          <Typography fontSize={18} color="inherit" component="div" sx={{ mr: 1 }}>
            Actions:
          </Typography>
          <ButtonGroup sx={{ backgroundColor: "white", mr: 1, border: "1px solid grey" }}>
            <Tooltip title={"Create-Actions"}>
              <IconButton
                children={<Add />}
                color={actionTypes.includes(ActionType.CREATE) ? "primary" : "default"}
                onClick={() => dispatch(AutologbookActions.toggleCreated())}
              />
            </Tooltip>
            <Tooltip title={"Edit-Actions"}>
              <IconButton
                children={<Edit />}
                color={actionTypes.includes(ActionType.UPDATE) ? "primary" : "default"}
                onClick={() => dispatch(AutologbookActions.toggleUpdated())}
              />
            </Tooltip>
            <Tooltip title={"Delete-Actions"}>
              <IconButton
                children={<Remove />}
                color={actionTypes.includes(ActionType.DELETE) ? "primary" : "default"}
                onClick={() => dispatch(AutologbookActions.toggleDeleted())}
              />
            </Tooltip>
          </ButtonGroup>

          <Typography fontSize={18} color="inherit" component="div" sx={{ mr: 1 }}>
            Entities:
          </Typography>
          <Select
            size="small"
            sx={{ backgroundColor: "white", maxWidth: 300, overflow: "hidden" }}
            multiple
            value={actionTargets}
            onChange={handleActionTargetsChange}
            renderValue={() => {
              return (
                <>
                  {actionTargets.map((actionTarget, index) => (
                    <React.Fragment key={actionTarget}>
                      {actionTarget2Title[actionTarget]}
                      {index < actionTargets.length - 1 && ", "}
                    </React.Fragment>
                  ))}
                </>
              );
            }}
          >
            {actionTargetValues.map((actionTarget) => {
              return (
                <MenuItem key={actionTarget} value={actionTarget} disabled={false}>
                  <Checkbox checked={actionTargets.includes(actionTarget)} />
                  <ListItemText>{actionTarget2Title[actionTarget]}</ListItemText>
                </MenuItem>
              );
            })}
          </Select>
        </>
      )}
    </>
  );
}
