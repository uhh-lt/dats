import BalanceIcon from "@mui/icons-material/Balance";
import InfoIcon from "@mui/icons-material/Info";
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  Grid,
  Input,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  TextField,
} from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import React from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { AnalysisActions } from "../analysisSlice";

function TimelineAnalysisSettings() {
  // redux
  const groupBy = useAppSelector((state) => state.analysis.groupBy);
  const metadataKey = useAppSelector((state) => state.analysis.metadataKey);
  const threshold = useAppSelector((state) => state.analysis.threshold);
  const dispatch = useAppDispatch();

  // local state
  const [sliderValue, setSliderValue] = React.useState<number>(threshold);

  // handlers (for ui)
  const handleGroupByChange = (event: SelectChangeEvent<"day" | "month" | "year">) => {
    dispatch(AnalysisActions.setGroupBy(event.target.value as "day" | "month" | "year"));
  };
  const handleChangeMetadataKey = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(AnalysisActions.setMetadataKey(event.target.value));
  };
  const handleChangeThreshold = (event: Event, newValue: number | number[]) => {
    setSliderValue(newValue as number);
  };
  const handleBlur = () => {
    dispatch(AnalysisActions.setThreshold(sliderValue));
  };

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title="Settings"
        subheader="Adjust the visualization settings"
      />
      <CardContent className="myFlexFillAllContainer">
        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel id="groupBy-label">Group by</InputLabel>
            <Select value={groupBy} onChange={handleGroupByChange} label={"Group by"}>
              <MenuItem value={"day"}>
                <ListItemText>Day</ListItemText>
              </MenuItem>
              <MenuItem value={"month"}>
                <ListItemText>Month</ListItemText>
              </MenuItem>
              <MenuItem value={"year"}>
                <ListItemText>Year</ListItemText>
              </MenuItem>
            </Select>
            <FormHelperText>Specify the aggregation of the results.</FormHelperText>
          </FormControl>

          <FormControl fullWidth>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                label={"Metadata key"}
                variant="outlined"
                value={metadataKey}
                onChange={handleChangeMetadataKey}
              />
              <Button
                variant="outlined"
                disabled={metadataKey.length === 0}
                onClick={() => dispatch(AnalysisActions.setMetadataCheckerOpen(true))}
              >
                Check
              </Button>
            </Stack>
            <FormHelperText>Specify the metadata key that denotes the date of the documents.</FormHelperText>
          </FormControl>
          <FormControl fullWidth>
            <Box
              sx={{
                border: 1,
                borderRadius: 1,
                borderColor: "grey.400",
                p: 1,
                position: "relative",
              }}
            >
              <Typography
                id="input-slider"
                fontSize={13}
                paddingX={0.5}
                color={"text.secondary"}
                style={{
                  position: "absolute",
                  top: -10,
                  backgroundColor: "white",
                }}
                gutterBottom
              >
                Threshold
              </Typography>
              <Grid container spacing={2} sx={{ mt: "-8px" }} alignItems="center">
                <Grid item>
                  <BalanceIcon />
                </Grid>
                <Grid item xs>
                  <Slider
                    value={sliderValue}
                    onChange={handleChangeThreshold}
                    onChangeCommitted={handleBlur}
                    aria-labelledby="input-slider"
                  />
                </Grid>
                <Grid item>
                  <Input
                    value={sliderValue}
                    size="small"
                    readOnly
                    disableUnderline
                    inputProps={{
                      step: 10,
                      min: 0,
                      max: 100,
                      type: "number",
                      "aria-labelledby": "input-slider",
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
            <FormHelperText>
              Only consider sentences with similarity greater or equal than the threshold for the analysis.
            </FormHelperText>
          </FormControl>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default TimelineAnalysisSettings;
