import { Box } from "@mui/material";

interface EmojiRendererProps {
  emoji: string;
  fontSize?: string;
}

export function EmojiRenderer({ emoji, fontSize = "inherit" }: EmojiRendererProps) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        flexShrink: 0,
        fontFamily: '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
        fontSize,
        lineHeight: 1,
        opacity: 1,
        filter: "saturate(1.35) contrast(1.15)",
      }}
    >
      {emoji}
    </Box>
  );
}
