import { DialogSection } from "@components/DialogSection";
import { featureQueries, groupFeaturesByArea } from "@core/feature";
import { ProjectHooks } from "@core/project";
import { FeatureRead } from "@models/FeatureRead";
import { ProjectRead } from "@models/ProjectRead";
import { Box, List, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FeatureActivationDialog } from "./FeatureActivationDialog";
import { ProjectFeatureListItem } from "./ProjectFeatureListItem";

interface ProjectFeaturesProps {
  project: ProjectRead;
}

/** Every toggleable feature with its status in the project and its one action: enable, complete or disable. */
export function ProjectFeatures({ project }: ProjectFeaturesProps) {
  const features = useQuery(featureQueries.list());
  const states = ProjectHooks.usePollProjectFeatures(project.id);
  const areas = useMemo(() => groupFeaturesByArea(features.data ?? []), [features.data]);

  // the feature to enable or complete
  const [activating, setActivating] = useState<FeatureRead | null>(null);
  const handleCloseActivation = () => setActivating(null);

  if (features.isError || states.isError) {
    return <Typography p={2}>The features of the project could not be loaded.</Typography>;
  }
  if (!features.isSuccess || !states.isSuccess) {
    return <Typography p={2}>Loading features...</Typography>;
  }

  return (
    <Stack spacing={2} p={2} overflow="auto" height="100%" sx={{ backgroundColor: "grey.100" }}>
      <Typography variant="body2" color="text.secondary">
        Features prepare data for every document when it is uploaded. Enabling a feature computes its data for the
        existing documents; disabling it hides it and stops computing its data, but keeps the data computed so far.
        Annotation, the LLM assistant and all tools not listed here are always available.
      </Typography>
      {areas.map((area) => (
        <Box key={area.title} flexShrink={0}>
          <DialogSection title={area.title} cardContentProps={{ sx: { p: 0, "&:last-child": { pb: 0 } } }}>
            <List disablePadding>
              {area.items.map((feature) => {
                const state = states.data[feature.feature];
                if (!state) return null;
                return (
                  <ProjectFeatureListItem
                    key={feature.feature}
                    projectId={project.id}
                    feature={feature}
                    state={state}
                    features={features.data}
                    states={states.data}
                    onActivate={setActivating}
                  />
                );
              })}
            </List>
          </DialogSection>
        </Box>
      ))}
      <FeatureActivationDialog
        projectId={project.id}
        feature={activating}
        state={activating ? states.data[activating.feature] : undefined}
        features={features.data}
        states={states.data}
        onClose={handleCloseActivation}
      />
    </Stack>
  );
}
