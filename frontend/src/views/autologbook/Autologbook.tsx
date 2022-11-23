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
import ActionCardDayView from "./ActionCardDayView";

function Autologbook() {
  const appBarContainerRef = useContext(AppBarContext);

  // global state
  const { user } = useAuth();

  // router
  const { projectId } = useParams() as {
    projectId: string;
  };

  // global state (redux)
  const dispatch = useAppDispatch();
  const year = useAppSelector((state) => state.autologbook.year);
  const week = useAppSelector((state) => state.autologbook.week);

  const userActions = ProjectHooks.useGetActions(parseInt(projectId), user.data!.id);

  const getWeekNumber = (date: Date) => {
    let year = date.getFullYear();
    let startDate: Date = new Date(year, 0, 1);
    let days = Math.floor((date.getTime() - startDate.getTime()) / 86400000);
    return Math.ceil(days / 7);
  }

  const numWeeksinYear: (year: number) => number = (year) => {
    let d = new Date(year, 11, 31);
    let week = getWeekNumber(d);
    return week == 1 ? 52 : week;
  }

  const getDateOfISOWeek: (week: number, year: number) => Date = (week, year) => {
    let simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    let dow = simple.getDay();
    let ISOweekStart = simple;
    if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
  }

  const getWeekDates: (weekStart: Date) => Date[] = (weekStart) => {
    let days: Date[] = new Array<Date>(7).fill(new Date()).map(() => new Date(weekStart.getTime()))
    days.forEach((day, index) => day.setDate(day.getDate() + index))
    return days
  }

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
  }, [userActions.data])

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Automatic Logbook
        </Typography>
      </Portal>
      {!actionsEachDay && <div>Loading!</div>}
      <Grid container rowSpacing={1} columnSpacing={{ sm: 40 }}>
        {!!actionsEachDay && actionsEachDay.map((actions, index) =>
          <Grid item xs={1} sm={1} md={1} lg={1} xl={1}>
            <ActionCardDayView actions={actions} day={selectedWeek[index]} />
          </Grid>
        )}
      </Grid>
    </>
  );
}

export default Autologbook;
