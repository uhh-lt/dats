import { ProjectHooks } from "@api/hooks/ProjectHooks";
import { getIconComponent, Icon } from "@components/icons";
import { Stack, Typography } from "@mui/material";

interface FolderRootRendererProps {
  projectId?: number;
  renderName?: boolean;
  renderIcon?: boolean;
}

export function FolderRootRenderer({ projectId, renderIcon, renderName }: FolderRootRendererProps) {
  const project = ProjectHooks.useGetProject(projectId);

  if (project.isSuccess) {
    return (
      <Stack spacing={2} direction="row" alignItems="center" width="100%">
        {renderIcon && getIconComponent(Icon.ROOT_FOLDER)}
        {renderName && <Typography>{`Project: ${project.data.title}`}</Typography>}
      </Stack>
    );
  } else if (project.isError) {
    return <div>{project.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}
