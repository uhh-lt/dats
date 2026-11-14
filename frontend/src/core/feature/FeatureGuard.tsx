import { FeatureCoverageHint } from "./FeatureCoverageHint";
import { FrontendFeature } from "./features";
import { FeatureNotEnabledView } from "./FeatureNotEnabledView";
import { useFeature } from "./useFeature";

interface FeatureGuardProps {
  /** The feature of the current page; pages without one are always shown. */
  feature: FrontendFeature | undefined;
  children: React.ReactNode;
}

/** Renders the page of an enabled feature (with a coverage hint while it is not ready) or the "not enabled" view. */
export function FeatureGuard({ feature, children }: FeatureGuardProps) {
  const enabled = useFeature(feature);
  if (feature === undefined) return children;
  if (!enabled) return <FeatureNotEnabledView feature={feature} />;
  return (
    <>
      {children}
      <FeatureCoverageHint feature={feature} />
    </>
  );
}
