import { Feature } from "@models/Feature";
import { Chip, Tooltip } from "@mui/material";
import { getFeatureTitle } from "./featureRegistry";
import { useFeature } from "./useFeature";

interface FeatureCoverageHintProps {
  feature: Feature;
}

/**
 * An unobtrusive hint for a feature that is enabled but still being computed: it is usable with the documents that
 * already have its data. Renders nothing for a ready or disabled feature.
 */
export function FeatureCoverageHint({ feature }: FeatureCoverageHintProps) {
  const { enabled, ready, coverage } = useFeature(feature);
  if (!enabled || ready) return null;

  const percent = Math.floor(coverage * 100);
  return (
    <Tooltip
      title={`${getFeatureTitle(feature)} is still being computed. Results include only the ${percent} % of documents that are already processed.`}
    >
      <Chip
        size="small"
        color="info"
        label={`${percent} % of documents processed`}
        sx={{ position: "fixed", right: 16, bottom: 16, zIndex: (theme) => theme.zIndex.fab, opacity: 0.9 }}
      />
    </Tooltip>
  );
}
