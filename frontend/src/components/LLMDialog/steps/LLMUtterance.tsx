import SmartToyIcon from "@mui/icons-material/SmartToy";
import { Box, Stack, StackProps } from "@mui/material";

function LLMUtterance({
  children,
  ...props
}: { children?: React.ReactNode } & Omit<StackProps, "direction" | "alignItems">) {
  return (
    <Stack direction="row" alignItems="center" {...props}>
      <SmartToyIcon fontSize="large" color="primary" />
      <Box className="speech-bubble" sx={{ ml: 8 }}>
        {children}
      </Box>
    </Stack>
  );
}

export default LLMUtterance;
