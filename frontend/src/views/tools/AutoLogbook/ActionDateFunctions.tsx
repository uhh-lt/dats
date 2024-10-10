import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import { ChangeEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { AutologbookActions } from "./autologbookSlice.ts";

const weekString = (dayStart: number, dayEnd: number) => {
  const start = new Date(dayStart).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" });
  const end = new Date(dayEnd).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" });

  return `${start} - ${end}`;
};

const yyyyMMdd = (date: Date) => {
  return date.toISOString().split("T")[0];
};

function ActionDateFunctions() {
  // global state (redux)
  const dispatch = useAppDispatch();
  const visibleDays = useAppSelector((state) => state.autologbook.visibleDays);
  const timestampFrom = useAppSelector((state) => state.autologbook.timestampFrom);
  const timestampTo = useAppSelector((state) => state.autologbook.timestampTo);

  const handleDateChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const dateTo = new Date(e.target.value);
    const dateFrom = new Date(e.target.value);
    dateFrom.setDate(dateFrom.getDate() - (visibleDays - 1));

    dispatch(AutologbookActions.setTimestampTo(dateTo.getTime()));
    dispatch(AutologbookActions.setTimestampFrom(dateFrom.getTime()));
  };

  const handleVisibleDaysChange = (event: SelectChangeEvent<number>) => {
    dispatch(AutologbookActions.setVisibleDays(event.target.value as number));
  };

  return (
    <>
      <IconButton children={<ArrowBackIosNewIcon />} onClick={() => dispatch(AutologbookActions.prev())} />
      <Typography fontSize={22} component="div" sx={{ minWidth: 280, textAlign: "center" }}>
        {weekString(timestampFrom, timestampTo)}
      </Typography>
      <IconButton children={<ArrowForwardIosIcon />} onClick={() => dispatch(AutologbookActions.next())} />
      <TextField
        id="date"
        label="Selected Day"
        value={yyyyMMdd(new Date(timestampTo))}
        type="date"
        size="small"
        onChange={handleDateChange}
        sx={{ marginLeft: 1.7, marginRight: 2, width: 160 }}
        slotProps={{
          inputLabel: { shrink: true },
        }}
      />
      <FormControl>
        <InputLabel id="days-label">Settings</InputLabel>
        <Select
          labelId="days-label"
          size="small"
          value={visibleDays}
          label="Settings"
          onChange={handleVisibleDaysChange}
        >
          <MenuItem value={4}>Four</MenuItem>
          <MenuItem value={5}>Five</MenuItem>
          <MenuItem value={6}>Six</MenuItem>
          <MenuItem value={7}>Seven</MenuItem>
        </Select>
      </FormControl>
    </>
  );
}

export default ActionDateFunctions;
