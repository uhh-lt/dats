import { FeatureRead } from "@models/FeatureRead";
import { Box, Checkbox, FormControlLabel, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { MouseEvent, useMemo } from "react";
import { groupFeaturesByArea } from "./features";

type FeaturePreset = "everything" | "minimal" | "custom";

interface FeatureSelectionProps {
  /** Every toggleable feature (`featureQueries.list()`). */
  features: FeatureRead[];
  value: string[];
  onChange: (features: string[]) => void;
}

/**
 * Choose the features of a project, grouped by area, with the presets "Everything" and "Minimal".
 */
export function FeatureSelection({ features, value, onChange }: FeatureSelectionProps) {
  const areas = useMemo(() => groupFeaturesByArea(features), [features]);

  const preset: FeaturePreset =
    value.length === 0 ? "minimal" : value.length === features.length ? "everything" : "custom";

  const handleChangePreset = (_event: MouseEvent<HTMLElement>, newPreset: FeaturePreset | null) => {
    if (newPreset === "everything") onChange(features.map((f) => f.feature));
    if (newPreset === "minimal") onChange([]);
  };

  const handleToggle = (feature: string, checked: boolean) => {
    // the selection keeps the order of the backend list
    onChange(features.map((f) => f.feature).filter((f) => (f === feature ? checked : value.includes(f))));
  };

  return (
    <Stack spacing={2}>
      <Box>
        <ToggleButtonGroup value={preset} exclusive size="small" color="primary" onChange={handleChangePreset}>
          <ToggleButton value="everything">Everything</ToggleButton>
          <ToggleButton value="minimal">Minimal</ToggleButton>
          <ToggleButton value="custom" disabled>
            Custom
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary" mt={1}>
          {preset === "minimal"
            ? "Only the tools that are always available: uploads are processed fastest."
            : "The selected features are prepared for every uploaded document. You can change this later in the project settings."}
        </Typography>
      </Box>
      {areas.map((area) => (
        <Box key={area.area}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {area.area}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 2, rowGap: 1 }}>
            {area.items.map((feature) => (
              <FormControlLabel
                key={feature.feature}
                sx={{ alignItems: "flex-start", mr: 0 }}
                control={
                  <Checkbox
                    size="small"
                    sx={{ pt: 0.25 }}
                    checked={value.includes(feature.feature)}
                    onChange={(_event, checked) => handleToggle(feature.feature, checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">{feature.title}</Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {feature.description}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
