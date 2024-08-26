import SmartToyIcon from "@mui/icons-material/SmartToy";
import { Box, Stack } from "@mui/material";

function LLMUtterance({ children }: { children?: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center">
      <SmartToyIcon fontSize="large" color="primary" />
      <Box className="speech-bubble" sx={{ ml: 8 }}>
        {children}
      </Box>
    </Stack>
  );
}

export default LLMUtterance;
