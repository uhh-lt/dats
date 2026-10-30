import { keyframes, styled, Typography } from "@mui/material";

const shimmer = keyframes`
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
`;

/** Text with a moving highlight, for work in progress ("Thinking…", a running tool call). */
export const ShimmerText = styled(Typography)(({ theme }) => ({
  backgroundImage: `linear-gradient(90deg, ${theme.palette.text.secondary} 35%, ${theme.palette.text.primary} 50%, ${theme.palette.text.secondary} 65%)`,
  backgroundSize: "200% 100%",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  animation: `${shimmer} 1.6s linear infinite`,
  "@media (prefers-reduced-motion: reduce)": {
    animation: "none",
    color: theme.palette.text.secondary,
  },
}));
