import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import { Box, Button, Menu, MenuItem, Stack, Tooltip } from "@mui/material";
import { useState } from "react";
import { Node } from "reactflow";
import { HorizontalAlign } from "../../../../api/openapi/models/HorizontalAlign.ts";
import { VerticalAlign } from "../../../../api/openapi/models/VerticalAlign.ts";
import { BackgroundColorData } from "../../types/base/BackgroundColorData.ts";
import { BorderData } from "../../types/base/BorderData.ts";
import { TextData } from "../../types/base/TextData.ts";

const horizontalAlignIcons = {
  [HorizontalAlign.LEFT]: <FormatAlignLeftIcon />,
  [HorizontalAlign.CENTER]: <FormatAlignCenterIcon />,
  [HorizontalAlign.RIGHT]: <FormatAlignRightIcon />,
};

const verticalAlignIcons = {
  [VerticalAlign.TOP]: <VerticalAlignTopIcon />,
  [VerticalAlign.CENTER]: <VerticalAlignCenterIcon />,
  [VerticalAlign.BOTTOM]: <VerticalAlignBottomIcon />,
};

interface TextAlignmentToolProps {
  nodes: Node<BackgroundColorData | TextData | BorderData>[];
  showTextTools: boolean;
  handleHorizontalAlignClick: (align: HorizontalAlign) => () => void;
  handleVerticalAlignClick: (align: VerticalAlign) => () => void;
}

const TextAlignmentTool: React.FC<TextAlignmentToolProps> = ({
  nodes,
  showTextTools,
  handleHorizontalAlignClick,
  handleVerticalAlignClick,
}: TextAlignmentToolProps) => {
  const [alignAnchor, setAlignAnchor] = useState<null | HTMLElement>(null);

  const getAlignIcon = () => {
    const textData = nodes[0]?.data as TextData;
    return horizontalAlignIcons[textData.horizontalAlign as HorizontalAlign] || FormatAlignLeftIcon;
  };

  const handleAlignClick = (event: React.MouseEvent<HTMLElement>) => {
    setAlignAnchor(event.currentTarget);
  };

  const handleAlignClose = () => {
    setAlignAnchor(null);
  };

  return (
    <>
      <Tooltip title="Text alignment" arrow disableHoverListener={Boolean(alignAnchor)}>
        <Box>
          <Button variant="text" onClick={handleAlignClick} sx={{ minWidth: 0, color: "black" }}>
            {showTextTools ? getAlignIcon() : <FormatAlignLeftIcon />}
          </Button>
        </Box>
      </Tooltip>
      <Menu
        anchorEl={alignAnchor}
        open={Boolean(alignAnchor)}
        onClose={handleAlignClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        sx={{
          "& .MuiPaper-root": {
            padding: 0,
            margin: 0,
            marginTop: "19px",
            elevation: 1,
            boxShadow: 1,
            width: "140px",
          },
          "& .MuiList-root": {
            padding: 0,
          },
        }}
      >
        <Stack direction="column">
          <Stack direction="row">
            {Object.values(HorizontalAlign).map((align) => {
              const icon = horizontalAlignIcons[align];
              return (
                <Box key={align} sx={{ width: "33.33%", display: "flex", justifyContent: "center", p: 0, m: 0 }}>
                  <MenuItem
                    key={align}
                    onClick={() => {
                      handleHorizontalAlignClick(align)();
                      handleAlignClose();
                    }}
                    selected={showTextTools && (nodes[0]?.data as TextData)?.horizontalAlign === align}
                    sx={{ minWidth: "auto", m: 0, p: 1 }}
                  >
                    {icon}
                  </MenuItem>
                </Box>
              );
            })}
          </Stack>
          <Stack direction="row">
            {Object.values(VerticalAlign).map((align) => {
              const icon = verticalAlignIcons[align];
              return (
                <Box key={align} sx={{ width: "33.33%", display: "flex", justifyContent: "center", p: 0, m: 0 }}>
                  <MenuItem
                    key={align}
                    onClick={() => {
                      handleVerticalAlignClick(align)();
                      handleAlignClose();
                    }}
                    selected={showTextTools && (nodes[0]?.data as TextData)?.verticalAlign === align}
                    sx={{ minWidth: "auto", m: 0, p: 1 }}
                  >
                    {icon}
                  </MenuItem>
                </Box>
              );
            })}
          </Stack>
        </Stack>
      </Menu>
    </>
  );
};

export default TextAlignmentTool;
