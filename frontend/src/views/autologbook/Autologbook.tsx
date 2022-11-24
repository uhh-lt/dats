import React, { useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import "@toast-ui/editor/dist/toastui-editor.css";
import ProjectHooks from "../../api/ProjectHooks";
import ActionCard from "./ActionCard";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import {
  AppBar,
  Box, Button,
  ButtonGroup,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Grid, Paper,
  Portal,
  Toolbar,
  Typography
} from "@mui/material";
import CodeExplorer from "../annotation/CodeExplorer/CodeExplorer";
import MemoExplorer from "../annotation/MemoExplorer/MemoExplorer";
import { ActionRead } from "../../api/openapi";
import ActionCardWeekView from "./ActionCardWeekView";
import ActionDateFunctions, { getDateOfISOWeek, getWeekDates } from "./ActionDateFunctions";

function Autologbook() {
  const appBarContainerRef = useContext(AppBarContext);

  // global state
  const { user } = useAuth();

  // router
  const { projectId } = useParams() as {
    projectId: string;
  };

  // global state (redux)
  const year = useAppSelector((state) => state.autologbook.year);
  const week = useAppSelector((state) => state.autologbook.week);

  const userActions = ProjectHooks.useGetActions(parseInt(projectId), user.data!.id);

  const selectedWeekDates: () => Date[] = () => {
    let weekStart: Date = getDateOfISOWeek(week, year)
    return getWeekDates(weekStart)
  }

  // Gets the day index of a date in the selected week (or -1 if not in the week)
  const getDayIndexInSelectedWeek: (date: Date, weekArr: Date[]) => number = (date, weekArr) => {
    let weekStart: Date = weekArr[0]
    let weekEnd: Date = weekArr[weekArr.length - 1]
    let dYear = date.getFullYear()
    if (dYear === weekStart.getFullYear() || dYear === weekEnd.getFullYear()) {
      let dMonth = date.getMonth()
      let startMonth = weekStart.getMonth()
      let endMonth = weekEnd.getMonth()
      if (startMonth === endMonth) {
        if (dMonth === endMonth && date.getDate() >= weekStart.getDate() && date.getDate() <= weekEnd.getDate()) {
          return date.getDate() - weekStart.getDate()
        }
      } else {
        if (dMonth === startMonth) {
          if (date.getDate() >= weekStart.getDate()) {
            return date.getDate() - weekStart.getDate()
          }
        } else if (dMonth === endMonth && date.getDate() <= weekEnd.getDate()) {
          return 6 - weekEnd.getDate() - date.getDate()
        }
      }
    }
    return -1
  }

  const selectedWeek: Date[] = selectedWeekDates()

  const actionsEachDay: ActionRead[][] = useMemo(() => {
    if (!userActions.data)
      return []

    let result: ActionRead[][] = [[], [], [], [], [], [], []]
    userActions.data.forEach((action) => {
      let date: Date = new Date(action.executed);
      let weekDay: number = getDayIndexInSelectedWeek(date, selectedWeek)
      if (weekDay >= 0) {
        result[weekDay].push(action)
      }
    })
    return result
  }, [userActions.data, week, year])

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Automatic Logbook
        </Typography>
      </Portal>
      {!actionsEachDay && <div>Loading!</div>}
      <Grid container columnSpacing={2}>
        <Grid item xs={6} sm={6} md={6} lg={6} xl={6}>
          <p>Placeholder Filters</p>
        </Grid>
        <Grid item xs={6} sm={6} md={6} lg={6} xl={6}>
          <ActionDateFunctions weekDays={selectedWeek} />
        </Grid>
      </Grid>
      <Grid container columnSpacing={2} justifyContent="center" style={{ minHeight: '83vh' }}>
        {!!actionsEachDay && actionsEachDay.map((actions, index) =>
          <Grid item xs={1.7} sm={1.7} md={1.7} lg={1.7} xl={1.7}>
            <ActionCardWeekView actions={actions} day={selectedWeek[index]} />
          </Grid>
        )}
      </Grid>
    </>
  );
}

export default Autologbook;
