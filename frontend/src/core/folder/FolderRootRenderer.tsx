import { ProjectHooks } from "@api/hooks/ProjectHooks";
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { getIconComponent, Icon } from "@components/icons";
import { ProjectRead } from "@models/ProjectRead";
import { Stack, Typography } from "@mui/material";
import { memo } from "react";

export interface FolderRootRendererSharedProps extends ExpandableRendererProps {
  renderName?: boolean;
  renderIcon?: boolean;
}

interface FolderRootRendererProps extends FolderRootRendererSharedProps {
  projectId?: number;
}

export const FolderRootRenderer = memo(({ projectId, ...props }: FolderRootRendererProps) => {
  return <FolderRootRendererWithoutData projectId={projectId} {...props} />;
});

const FolderRootRendererWithoutData = memo(
  ({ projectId, ...props }: { projectId?: number } & FolderRootRendererSharedProps) => {
    const project = ProjectHooks.useGetProject(projectId);

    if (project.isSuccess) {
      return <FolderRootRendererWithData project={project.data} {...props} />;
    } else if (project.isError) {
      return <div>{project.error.message}</div>;
    } else {
      return <div>Loading...</div>;
    }
  },
);

const FolderRootRendererWithData = memo(
  ({ project, renderIcon, renderName, ...expandProps }: { project: ProjectRead } & FolderRootRendererSharedProps) => {
    return (
      <ExpandableRenderer {...expandProps} expandedContent={<FolderRootContext project={project} />}>
        <Stack direction="row" alignItems="center" spacing={2} minWidth={0} maxWidth="100%" overflow="hidden">
          {renderIcon && getIconComponent(Icon.ROOT_FOLDER, { style: { flexShrink: 0 } })}
          {renderName && (
            <Typography component="span" noWrap minWidth={0}>
              Project: {project.title}
            </Typography>
          )}
        </Stack>
      </ExpandableRenderer>
    );
  },
);

function FolderRootContext({ project }: { project: ProjectRead }) {
  return (
    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {project.description || "No description available."}
    </Typography>
  );
}
