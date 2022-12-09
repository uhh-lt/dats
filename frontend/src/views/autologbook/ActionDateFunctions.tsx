import React, { ChangeEvent } from "react";
import { Box, IconButton, TextField } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { AutologbookActions, getWeekNumber } from "./autologbookSlice";


interface ActionDateFunctionsProps {
  weekDays: Date[]
}

function ActionDateFunctions({ weekDays }: ActionDateFunctionsProps) {

  // global state (redux)
  const dispatch = useAppDispatch();
  const year = useAppSelector((state) => state.autologbook.year);

  const locale = "en-GB"

  const startDate: Date = weekDays[0]
  const endDate: Date = weekDays[weekDays.length - 1]

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

  const weekStartString = (weekStart: Date) => {
    let month = weekStart.toLocaleString(locale, { month: '2-digit' });
    let day = weekStart.toLocaleString(locale, { day: '2-digit' });
    return `${weekStart.getFullYear()}-${month}-${day}`
  }

  const weekStartDate: string = weekStartString(startDate)

  const newDateHandler = (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    let date = new Date(e.target.value)
    date.setDate(date.getDate() - 1)
    dispatch(AutologbookActions.setYear(date.getFullYear()))
    dispatch(AutologbookActions.setWeek(getWeekNumber(date)))
  }

  return (
    <>
      <Box display='flex' alignItems='center' style={{ width: '100%', height: '100%', minHeight: '2.8em', fontSize: 20 }}>
        <IconButton style={{ marginLeft: 130 }} children={<ArrowBackIosNewIcon/>}
                    onClick={() => dispatch(AutologbookActions.prevWeek())}/>
        <div style={{ width: '30%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {weekString(startDate, endDate)}
        </div>
        <IconButton children={<ArrowForwardIosIcon/>} onClick={() => dispatch(AutologbookActions.nextWeek())}/>
        <TextField
          id="date"
          label="Selected Week"
          defaultValue={weekStartDate}
          type="date"
          size='small'
          onChange={(e) => newDateHandler(e)}
          sx={{ marginLeft: 1.7, width: 160 }}
          InputLabelProps={{
            shrink: true,
          }}
        />
      </Box>
    </>
  )
}


export default ActionDateFunctions;
