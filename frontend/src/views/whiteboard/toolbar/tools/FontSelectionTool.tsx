import { FormControl, MenuItem, Select, SelectChangeEvent, Tooltip } from "@mui/material";
import { FONT_FAMILIES } from "../../whiteboardUtils";

interface FontSelectionToolProps {
  currentFontFamily: string;
  onFontFamilyChange: (event: SelectChangeEvent) => void;
  isMenuOpen: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
}

export default function FontSelectionTool({
  currentFontFamily,
  onFontFamilyChange,
  isMenuOpen,
  onMenuOpen,
  onMenuClose,
}: FontSelectionToolProps) {
  return (
    <Tooltip title="Font Family" arrow disableHoverListener={isMenuOpen}>
      <FormControl size="small" sx={{ mr: 1, minWidth: 120 }}>
        <Select
          value={currentFontFamily}
          onChange={onFontFamilyChange}
          displayEmpty
          inputProps={{ "aria-label": "Font Family" }}
          sx={{
            fontSize: "0.8rem",
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          }}
          MenuProps={{
            sx: {
              "& .MuiPaper-root": {
                boxShadow: 1,
                marginTop: "19px",
              },
            },
          }}
          onOpen={onMenuOpen}
          onClose={onMenuClose}
        >
          {currentFontFamily === "" && (
            <MenuItem value="" disabled>
              <em>Multiple Fonts</em>
            </MenuItem>
          )}
          {FONT_FAMILIES.map((font) => (
            <MenuItem key={font} value={font} sx={{ fontFamily: font, fontSize: "0.9rem" }}>
              {font}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Tooltip>
  );
}
