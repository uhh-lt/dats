import { DATSLogo } from "@components/DATSLogo";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";

interface RouteErrorPanelProps {
  title: string;
  description: string;
  error: unknown;
  actions?: ReactNode;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "An unexpected error occurred while loading this page.";
}

function getTechnicalDetails(error: unknown): string | null {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return null;
}

/**
 * Shared, route-level fallback panel used by TanStack Router error boundaries.
 */
export function RouteErrorPanel({ title, description, error, actions }: RouteErrorPanelProps) {
  const technicalDetails = getTechnicalDetails(error);

  return (
    <Stack spacing={4}>
      <DATSLogo />
      <Paper
        elevation={1}
        sx={{
          width: "100%",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 3, md: 4 },
        }}
      >
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box
              sx={{
                width: 66,
                height: 66,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.12),
              }}
            >
              <ErrorOutlineRoundedIcon color="error" fontSize="large" />
            </Box>
            <Stack spacing={0.75}>
              <Typography variant="h5">{title}</Typography>
              <Typography variant="body1" color="text.secondary">
                {description}
              </Typography>
            </Stack>
          </Stack>

          <Alert severity="error" variant="outlined">
            <AlertTitle>Request failed</AlertTitle>
            {getErrorMessage(error)}
          </Alert>

          {actions && (
            <Stack direction="row" sx={{ justifyContent: "space-around" }}>
              {actions}
            </Stack>
          )}

          {technicalDetails && (
            <Accordion
              disableGutters
              elevation={0}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography variant="subtitle2">Technical details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 2,
                    borderRadius: 1,
                    bgcolor: "grey.100",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                >
                  {technicalDetails}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
