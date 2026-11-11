import { Feature } from "@models/Feature";
import { FeatureRead } from "@models/FeatureRead";
import { Box, Checkbox, FormControlLabel, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { MouseEvent, useMemo } from "react";
import { deselectFeature, groupFeaturesByArea, selectFeature } from "./featureAreas";

type FeaturePreset = "everything" | "minimal" | "custom";

interface FeatureSelectionProps {
  /** Every toggleable feature (`featureQueries.list()`). */
  features: FeatureRead[];
  value: Feature[];
  onChange: (features: Feature[]) => void;
}

/**
 * Choose the features of a project, grouped by area, with the presets "Everything" and "Minimal". Selecting a feature
 * selects the features it requires; deselecting one deselects the features that need it.
 */
export function FeatureSelection({ features, value, onChange }: FeatureSelectionProps) {
  const requires = useMemo(() => new Map(features.map((f) => [f.feature, f.requires_features])), [features]);
  const titles = useMemo(() => new Map(features.map((f) => [f.feature, f.title])), [features]);
  const areas = useMemo(() => groupFeaturesByArea(features), [features]);

  const preset: FeaturePreset =
    value.length === 0 ? "minimal" : value.length === features.length ? "everything" : "custom";

  const handleChangePreset = (_event: MouseEvent<HTMLElement>, newPreset: FeaturePreset | null) => {
    if (newPreset === "everything") onChange(features.map((f) => f.feature));
    if (newPreset === "minimal") onChange([]);
  };

  const handleToggle = (feature: Feature, checked: boolean) => {
    onChange(checked ? selectFeature(value, feature, requires) : deselectFeature(value, feature, requires));
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
        <Box key={area.title}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {area.title}
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
                      {feature.requires_features.length > 0 &&
                        ` Needs ${feature.requires_features.map((f) => titles.get(f) ?? f).join(", ")}.`}
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
