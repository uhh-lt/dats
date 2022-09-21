import { Box, Container, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { SettingsActions } from "./settingsSlice";

function Settings() {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const tagStyle = useAppSelector((state) => state.settings.annotator.tagStyle);

  // ui events
  const handleToggleTagStyle = () => {
    dispatch(SettingsActions.toggleAnnotatorTagStyle());
  };

  return (
    <>
      <Box className="h100" style={{ overflowY: "auto" }}>
        <Container maxWidth="md" className="h100">
          <Typography variant="h3">Settings</Typography>
          <Typography variant="h5">Annotator</Typography>
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
