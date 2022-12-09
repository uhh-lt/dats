import React, { useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import "@toast-ui/editor/dist/toastui-editor.css";
import ProjectHooks from "../../api/ProjectHooks";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import {
  Grid,
  Portal,
  Typography
} from "@mui/material";
import { ActionRead, ActionTargetObjectType } from "../../api/openapi";
import ActionCardWeekView from "./ActionCardWeekView";
import ActionDateFunctions from "./ActionDateFunctions";
import { AutologbookActions, getDateOfISOWeek, getWeekDates } from "./autologbookSlice";
import { ActionFilters } from "./ActionFilters";

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
  const showCreated = useAppSelector((state) => state.autologbook.showCreated);
  const showUpdated = useAppSelector((state) => state.autologbook.showUpdated);
  const showDeleted = useAppSelector((state) => state.autologbook.showDeleted);
  const userFilter = useAppSelector((state) => state.autologbook.userFilter);
  const entityFilter = useAppSelector((state) => state.autologbook.entityFilter);

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

  const filterAction: (action: ActionRead, entityIdx: number) => boolean = (action, entityIdx) => {
    if (action.action_type === 0) {
      if (!showCreated) {
        return false
      }
    } else if (action.action_type === 1) {
      if (!showUpdated) {
        return false
      }
    } else {
      if (!showDeleted) {
        return false
      }
    }
    if (entityFilter !== undefined && !entityFilter.has(entityIdx)) {
      return false
    }
    return !(userFilter !== undefined && !userFilter.has(action.user_id));

  }

  const actionsEachDay: ActionRead[][] = useMemo(() => {
    if (!userActions.data)
      return []

    let userSet = new Set<number>()
    let entitySet = new Set<number>()
    let entityValues = Object.values(ActionTargetObjectType)
    let result: ActionRead[][] = [[], [], [], [], [], [], []]
    userActions.data.forEach((action) => {
      userSet.add(action.user_id)
      let entityIdx = entityValues.indexOf(action.target_object_type)
      entitySet.add(entityIdx)
      if (!filterAction(action, entityIdx)) {
        return
      }
      let date: Date = new Date(action.executed);
      let weekDay: number = getDayIndexInSelectedWeek(date, selectedWeek)
      if (weekDay >= 0) {
        result[weekDay].push(action)
      }
    })
    let userArr = Array.from(userSet).sort();
    dispatch(AutologbookActions.setVisibleUserIds(userArr));
    let entityArr = Array.from(entitySet).sort();
    dispatch(AutologbookActions.setVisibleEntityIds(entityArr));
    if (userFilter === undefined || entityFilter === undefined) {
      dispatch(AutologbookActions.setUserFilter(userArr));
      dispatch(AutologbookActions.setEntityFilter(entityArr));
    }
    return result
  }, [userActions.data, week, year, showCreated, showUpdated, showDeleted, userFilter, entityFilter])

  // FIXME: When shrinking the window, the actioncardweekview is not fully scrollable
  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Automatic Logbook
        </Typography>
      </Portal>
      {!actionsEachDay && <div>Loading!</div>}
      <div style={{ minHeight: '100%', overflow: 'auto' }}>
        <Grid container columnSpacing={2}>
          <Grid item xs={6} sm={6} md={6} lg={6} xl={6}>
            <ActionFilters/>
          </Grid>
          <Grid item xs={6} sm={6} md={6} lg={6} xl={6}>
            <ActionDateFunctions weekDays={selectedWeek} />
          </Grid>
        </Grid>
        <Grid container columnSpacing={2} justifyContent="center" overflow={'auto'} style={{ minHeight: '82.5vh' }}>
          {!!actionsEachDay && actionsEachDay.map((actions, index) =>
            <Grid item xs={1.7} sm={1.7} md={1.7} lg={1.7} xl={1.7}>
              <ActionCardWeekView actions={actions} day={selectedWeek[index]} />
            </Grid>
          )}
        </Grid>
      </div>
    </>
  );
}

export default Autologbook;
