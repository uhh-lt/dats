import { Box, styled } from "@mui/material";

export const Container = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isHorizontal",
})<{ isHorizontal: boolean }>(({ isHorizontal }) => ({
  display: "flex",
  flexDirection: isHorizontal ? "row" : "column",
  width: "100%",
  height: "100%",
  position: "relative",
}));

export const Panel = styled(Box, {
  shouldForwardProp: (prop) => prop !== "size" && prop !== "isHorizontal",
})<{
  size: string | number;
  isHorizontal: boolean;
}>(({ size, isHorizontal }) => ({
  ...(isHorizontal
    ? {
        width: size,
        height: "100%",
      }
    : {
        width: "100%",
        height: size,
      }),
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  flex: "1 1 auto",
}));
