import { HorizontalAlign } from "@api/models/HorizontalAlign";
import { VerticalAlign } from "@api/models/VerticalAlign";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import { Button, Menu, MenuItem, Stack, Tooltip } from "@mui/material";
import { Node } from "@xyflow/react";
import { useState } from "react";
import { BackgroundColorData } from "../../../_types/base/BackgroundColorData";
import { BorderData } from "../../../_types/base/BorderData";
import { TextData } from "../../../_types/base/TextData";

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
  handleHorizontalAlignClick: (align: HorizontalAlign) => () => void;
  handleVerticalAlignClick: (align: VerticalAlign) => () => void;
}

export const TextAlignmentTool: React.FC<TextAlignmentToolProps> = ({
  nodes,
  handleHorizontalAlignClick,
  handleVerticalAlignClick,
}: TextAlignmentToolProps) => {
  const [alignAnchor, setAlignAnchor] = useState<null | HTMLElement>(null);

  const handleAlignClick = (event: React.MouseEvent<HTMLElement>) => {
    setAlignAnchor(event.currentTarget);
  };

  const handleAlignClose = () => {
    setAlignAnchor(null);
  };

  return (
    <>
      <Tooltip title="Text alignment" arrow disableHoverListener={Boolean(alignAnchor)}>
        <Button variant="text" size="small" onClick={handleAlignClick} sx={{ minWidth: 0, color: "black" }}>
          {horizontalAlignIcons[(nodes[0]?.data as TextData).horizontalAlign] || <FormatAlignLeftIcon />}
        </Button>
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
                <MenuItem
                  key={align}
                  onClick={() => {
                    handleHorizontalAlignClick(align)();
                    handleAlignClose();
                  }}
                  selected={(nodes[0]?.data as TextData)?.horizontalAlign === align}
                  sx={{ p: 1 }}
                >
                  {icon}
                </MenuItem>
              );
            })}
          </Stack>
          <Stack direction="row">
            {Object.values(VerticalAlign).map((align) => {
              const icon = verticalAlignIcons[align];
              return (
                <MenuItem
                  key={align}
                  onClick={() => {
                    handleVerticalAlignClick(align)();
                    handleAlignClose();
                  }}
                  selected={(nodes[0]?.data as TextData)?.verticalAlign === align}
                  sx={{ p: 1 }}
                >
                  {icon}
                </MenuItem>
              );
            })}
          </Stack>
        </Stack>
      </Menu>
    </>
  );
};
