import { Feature } from "@models/Feature";
import { Chip, Tooltip } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusHooks";
import { useFeatureCoverage, useFeatureTitle } from "./useFeature";

interface FeatureCoverageHintProps {
  feature: Feature;
}

/**
 * An unobtrusive hint for a feature that is enabled but not available for all documents (computing or partly
 * available): it is usable with the documents that already have its data. A click opens the Features tab of the
 * project settings. Renders nothing for a ready feature; the guard renders it for enabled features only. Its coverage
 * loads after the page and refreshes while the feature is computing.
 */
export function FeatureCoverageHint({ feature }: FeatureCoverageHintProps) {
  const state = useFeatureCoverage(feature);
  const title = useFeatureTitle(feature);
  const openProjectSettings = useOpenDialog("projectSettings");
  if (!state || state.ready) return null;

  const handleClick = () => openProjectSettings({ tab: "features" });

  const percent = Math.floor(state.coverage * 100);
  return (
    <Tooltip
      title={`${title} is not available for all documents. Results include only the ${percent} % of documents that have its data. Click to see its status in the project settings.`}
    >
      <Chip
        size="small"
        color="info"
        label={`${title}: ${percent} % of documents`}
        onClick={handleClick}
        sx={{ position: "fixed", right: 16, bottom: 16, zIndex: (theme) => theme.zIndex.fab, opacity: 0.9 }}
      />
    </Tooltip>
  );
}
