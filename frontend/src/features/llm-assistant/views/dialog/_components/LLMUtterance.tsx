import { Icon, getIconComponent } from "@components/icons";
import { Box, Stack, StackProps } from "@mui/material";
import { memo } from "react";

export const LLMUtterance = memo(
  ({ children, ...props }: { children?: React.ReactNode } & Omit<StackProps, "direction" | "alignItems">) => {
    return (
      <Stack direction="row" alignItems="center" {...props}>
        {getIconComponent(Icon.LLM_ASSISTANT, { fontSize: "large", color: "primary" })}
        <Box className="speech-bubble" sx={{ ml: 8 }}>
          {children}
        </Box>
      </Stack>
    );
  },
);
