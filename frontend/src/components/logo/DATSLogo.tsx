import { Box, Stack, Typography } from "@mui/material";

export function DATSLogo() {
  return (
    <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" ml="-16px">
      <img src="/DATS.svg" alt="DATS-logo" height={64}></img>
      <Box>
        <Typography variant="h4" component="div" align="left">
          Discourse Analysis Tool Suite
        </Typography>
        <Typography component="div" align="left" ml="2px">
          Developed by LT & HCDS
        </Typography>
      </Box>
    </Stack>
  );
}
