import { MenuItem, Select, SelectChangeEvent, TypographyVariant } from "@mui/material";

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
      defaultValue={variant}
      onChange={handleVariantChange}
      sx={{ mr: 1 }}
    >
      {["h1", "h2", "h3", "h4", "body1", "body2"].map((variant) => (
        <MenuItem key={variant} value={variant}>
          {variant.toUpperCase()}
        </MenuItem>
      ))}
    </Select>
  );
}

export default TypographyVariantTool;
