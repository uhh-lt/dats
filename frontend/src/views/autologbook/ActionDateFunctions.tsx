import React from "react";
import { Box, IconButton } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { AutologbookActions } from "./autologbookSlice";


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

export const getDateOfISOWeek: (week: number, year: number) => Date = (week, year) => {
  let simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  let dow = simple.getDay();
  let ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}

export const getWeekDates: (weekStart: Date) => Date[] = (weekStart) => {
  let days: Date[] = new Array<Date>(7).fill(new Date()).map(() => new Date(weekStart.getTime()))
  days.forEach((day, index) => day.setDate(day.getDate() + index))
  return days
}

interface ActionDateFunctionsProps {
  weekDays: Date[]
}

function ActionDateFunctions({ weekDays }: ActionDateFunctionsProps) {

  // global state (redux)
  const dispatch = useAppDispatch();
  const year = useAppSelector((state) => state.autologbook.year);
  const week = useAppSelector((state) => state.autologbook.week);

  const locale = "en-GB"

  // reformat datetime to better readable format
  const weekString = (weekStart: Date, weekEnd: Date) => {
    let startDay: number = weekStart.getDate()
    let endDay: number = weekEnd.getDate()
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      let month = weekStart.toLocaleString(locale, { month: 'long' });
      return `${startDay}. - ${endDay}. ${month} ${year}`
    } else {
      let startMonth = weekStart.toLocaleString(locale, { month: 'short' });
      let endMonth = weekEnd.toLocaleString(locale, { month: 'short' });
      if (weekStart.getMonth() === 11) {
        return `${startDay}. ${startMonth} ${year} - ${endDay}. ${endMonth} ${year + 1}`
      } else {
        return `${startDay}. ${startMonth} - ${endDay}. ${endMonth} ${year}`
      }
    }
  }

  const previousWeek = () => {
    let newWeek = week - 1;
    if (newWeek <= 0) {
      let newYear = year - 1
      newWeek = numWeeksinYear(newYear)
      dispatch(AutologbookActions.setYear(newYear));
      dispatch(AutologbookActions.setWeek(newWeek));
    } else {
      dispatch(AutologbookActions.setWeek(newWeek));
    }
  };

  const nextWeek = () => {
    let newWeek = week + 1;
    if (newWeek > 51) {
      let maxWeek = numWeeksinYear(year)
      if (newWeek > maxWeek) {
        dispatch(AutologbookActions.setYear(year + 1));
        dispatch(AutologbookActions.setWeek(1));
        return
      }
    }
    dispatch(AutologbookActions.setWeek(newWeek));
  };

  return (
    <>
      <Box display='flex' alignItems='center' style={{ width: '100%', height: '100%', fontSize: 20 }}>
        <IconButton style={{ marginLeft: 130 }} children={<ArrowBackIosNewIcon/>} onClick={() => previousWeek()}/>
        <div style={{ width: '30%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {weekString(weekDays[0], weekDays[weekDays.length - 1])}
        </div>
        <IconButton children={<ArrowForwardIosIcon/>} onClick={() => nextWeek()}/>
      </Box>
    </>
  )
}


export default ActionDateFunctions;
