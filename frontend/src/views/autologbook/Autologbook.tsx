import { Box, Grid, Portal, Toolbar, Typography } from "@mui/material";
import "@toast-ui/editor/dist/toastui-editor.css";
import { useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import { ActionRead } from "../../api/openapi";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useAppSelector } from "../../plugins/ReduxHooks";
import ActionCardWeekView from "./ActionCardWeekView";
import ActionDateFunctions from "./ActionDateFunctions";
import { ActionFilters } from "./ActionFilters";

function Autologbook() {
  const appBarContainerRef = useContext(AppBarContext);

  // router
  const { projectId } = useParams() as {
    projectId: string;
  };

  // global state (redux)
  const visibleDays = useAppSelector((state) => state.autologbook.visibleDays);
  const userIds = useAppSelector((state) => state.autologbook.userIds);
  const actionTargets = useAppSelector((state) => state.autologbook.actionTargets);
  const actionTypes = useAppSelector((state) => state.autologbook.actionTypes);
  const timestampFrom = useAppSelector((state) => state.autologbook.timestampFrom);
  const timestampTo = useAppSelector((state) => state.autologbook.timestampTo);

  // global server state (react-query)
  const actions = ProjectHooks.useQueryActions({
    proj_id: parseInt(projectId),
    user_ids: userIds,
    action_targets: actionTargets,
    action_types: actionTypes,
    timestamp_from: timestampFrom,
    timestamp_to: timestampTo,
  });

  const actionsPerDay = useMemo(() => {
    if (!actions.data) {
      return {};
    }

    const day2actions: Record<string, ActionRead[]> = {};

    for (let i = 0; i < visibleDays; i++) {
      let date = new Date(timestampFrom);
      date.setDate(date.getDate() + i);
      let day = date.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" });
      day2actions[day] = [];
    }

    actions.data.forEach((action) => {
      let date: Date = new Date(action.executed);
      let day = date.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" });

      if (day in day2actions) {
        day2actions[day].push(action);
      } else {
        day2actions[day] = [action];
      }
    });

    // sort actions here desc by date
    for (let key in day2actions) {
      day2actions[key] = day2actions[key].sort((a, b) => b.executed.localeCompare(a.executed));
    }

    return day2actions;
  }, [actions.data, visibleDays, timestampFrom]);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Automatic Logbook
        </Typography>
      </Portal>
      <div className="myFlexContainer h100">
        <Box className="myFlexFitContent">
          <Toolbar variant="dense" color="secondary">
            <ActionFilters projectId={parseInt(projectId)} />
            <Box sx={{ flexGrow: 1 }} />
            <ActionDateFunctions />
          </Toolbar>
        </Box>
        <Grid container className="myFlexFillAllContainer" columnSpacing={2}>
          {Object.entries(actionsPerDay).map(([day, actions]) => (
            <Grid key={day} item xs={12 / visibleDays} className="h100">
              <ActionCardWeekView actions={actions} day={day} />
            </Grid>
          ))}
        </Grid>
      </div>
    </>
  );
}

export default Autologbook;
