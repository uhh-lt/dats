import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import { Button, Menu, MenuItem, Stack, Tooltip } from "@mui/material";
import { useState } from "react";
import { TextData } from "../../types/base/TextData.ts";
import { TextStyle } from "../../types/base/TextStyle.ts";

const textStyleIcons = {
  [TextStyle.BOLD]: <FormatBoldIcon />,
  [TextStyle.ITALIC]: <FormatItalicIcon />,
  [TextStyle.UNDERLINE]: <FormatUnderlinedIcon />,
  [TextStyle.STRIKETHROUGH]: <StrikethroughSIcon />,
};

interface TextStyleToolProps {
  textData: TextData;
  onStyleChange: (style: TextStyle) => void;
}

const TextStyleTool: React.FC<TextStyleToolProps> = ({ textData, onStyleChange }) => {
  const [textStyleAnchor, setTextStyleAnchor] = useState<null | HTMLElement>(null);

  const handleTextStyleClick = (event: React.MouseEvent<HTMLElement>) => {
    setTextStyleAnchor(event.currentTarget);
  };

  const handleTextStyleClose = () => {
    setTextStyleAnchor(null);
  };

  const handleStyleClick = (style: TextStyle) => () => {
    onStyleChange(style);
    handleTextStyleClose();
  };

  return (
    <>
      <Tooltip title="Text style" arrow disableHoverListener={Boolean(textStyleAnchor)}>
        <Button variant="text" size="small" onClick={handleTextStyleClick} sx={{ minWidth: 0, color: "black" }}>
          <FormatBoldIcon />
        </Button>
      </Tooltip>
      <Menu
        anchorEl={textStyleAnchor}
        open={Boolean(textStyleAnchor)}
        onClose={handleTextStyleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        sx={{
          "& .MuiPaper-root": { boxShadow: 1, mt: "19px" },
          "& .MuiList-root": { p: 0 },
        }}
      >
        <Stack direction="row">
          {Object.values(TextStyle).map((style) => (
            <MenuItem
              key={style}
              onClick={handleStyleClick(style)}
              selected={textData[style]}
              sx={{ minWidth: "auto", m: 0, p: 1 }}
            >
              {textStyleIcons[style]}
            </MenuItem>
          ))}
        </Stack>
      </Menu>
    </>
  );
};
