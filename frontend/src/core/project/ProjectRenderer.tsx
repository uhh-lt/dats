import { ProjectHooks } from "@api/hooks/ProjectHooks";
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { ProjectRead } from "@models/ProjectRead";
import { Stack, Typography } from "@mui/material";
import { memo } from "react";

export type ProjectRendererSharedProps = ExpandableRendererProps;

interface ProjectRendererProps extends ProjectRendererSharedProps {
  project: number | ProjectRead;
}

export const ProjectRenderer = memo(({ project, ...props }: ProjectRendererProps) => {
  if (typeof project === "number") {
    return <ProjectRendererWithoutData projectId={project} {...props} />;
  } else {
    return <ProjectRendererWithData project={project} {...props} />;
  }
});

const ProjectRendererWithoutData = memo(
  ({ projectId, ...props }: { projectId: number } & ProjectRendererSharedProps) => {
    const project = ProjectHooks.useGetProject(projectId);

    if (project.isSuccess) {
      return <ProjectRendererWithData project={project.data} {...props} />;
    } else if (project.isError) {
      return <div>{project.error.message}</div>;
    } else {
      return <div>Loading...</div>;
    }
  },
);

const ProjectRendererWithData = memo(
  ({ project, ...expandProps }: { project: ProjectRead } & ProjectRendererSharedProps) => {
    return (
      <ExpandableRenderer {...expandProps} expandedContent={<ProjectContext project={project} />}>
        <Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden">
          <Typography component="span" noWrap minWidth={0}>
            Project: {project.title}
          </Typography>
        </Stack>
      </ExpandableRenderer>
    );
  },
);

function ProjectContext({ project }: { project: ProjectRead }) {
  return (
    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {project.description || "No description available."}
    </Typography>
  );
}
