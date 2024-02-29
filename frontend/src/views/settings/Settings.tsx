import { Box, Container, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { SettingsActions } from "./settingsSlice.ts";

function Settings() {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const sortStatsByGlobal = useAppSelector((state) => state.settings.search.sortStatsByGlobal);
  const tagStyle = useAppSelector((state) => state.settings.annotator.tagStyle);

  // ui events
  const handleToggleStatsOrder = () => {
    dispatch(SettingsActions.toggleStatsOrder());
  };

  const handleToggleTagStyle = () => {
    dispatch(SettingsActions.toggleAnnotatorTagStyle());
  };

  return (
    <>
      <Box className="h100" style={{ overflowY: "auto" }}>
        <Container maxWidth="md" className="h100">
          <Typography variant="h3" sx={{ mt: 1 }}>
            Settings
          </Typography>
          <Typography variant="h5" sx={{ mt: 2 }}>
            Search Results
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            Text Document Style:
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            Bar Plot Ordering:
          </Typography>
          <ToggleButtonGroup color="primary" value={sortStatsByGlobal} onClick={() => handleToggleStatsOrder()}>
            <ToggleButton value={false}>Filtered Count</ToggleButton>
            <ToggleButton value={true}>Total Count</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="h5" sx={{ mt: 2 }}>
            Annotator
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            Text Annotation Position:
          </Typography>
          <ToggleButtonGroup color="primary" value={tagStyle} onClick={() => handleToggleTagStyle()}>
            <ToggleButton value="inline">Inline</ToggleButton>
            <ToggleButton value="above">Above</ToggleButton>
          </ToggleButtonGroup>
        </Container>
      </Box>
    </>
  );
}

export default Settings;
