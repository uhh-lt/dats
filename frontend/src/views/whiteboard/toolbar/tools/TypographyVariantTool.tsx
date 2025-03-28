import { MenuItem, Select, SelectChangeEvent, Typography, TypographyVariant } from "@mui/material";

interface TypographyVariantToolProps {
  variant: TypographyVariant | undefined;
  onVariantChange: (variant: TypographyVariant) => void;
}

function TypographyVariantTool({ variant, onVariantChange }: TypographyVariantToolProps) {
  const handleVariantChange = (event: SelectChangeEvent<TypographyVariant>) => {
    onVariantChange(event.target.value as TypographyVariant);
  };

  return (
    <Select
      style={{ height: "32px" }}
      size="small"
      value={variant}
      onChange={handleVariantChange}
      renderValue={(value) => <Typography variant="body2">{value}</Typography>}
      sx={{
        mr: 1,
        width: "140px",
        "& .MuiSelect-select": {
          display: "flex",
          alignItems: "center",
        },
      }}
    >
      {["h1", "h2", "h3", "h4", "body1", "body2"].map((variant) => (
        <MenuItem key={variant} value={variant} sx={{ width: "140px", px: 2, py: 0 }}>
          <Typography variant={variant as TypographyVariant}>{variant}</Typography>
        </MenuItem>
      ))}
    </Select>
  );
}

export default TypographyVariantTool;
