import { ProjectHooks } from "@api/hooks/ProjectHooks";
import { ProjectRead } from "@models/ProjectRead";

interface ProjectRendererProps {
  project: number | ProjectRead;
}

export function ProjectRenderer({ project, ...props }: ProjectRendererProps) {
  if (typeof project === "number") {
    return <ProjectRendererWithoutData projectId={project} {...props} />;
  } else {
    return <ProjectRendererWithData project={project} {...props} />;
  }
}

function ProjectRendererWithoutData({ projectId, ...props }: { projectId: number }) {
  const project = ProjectHooks.useGetProject(projectId);

  if (project.isSuccess) {
    return <ProjectRendererWithData project={project.data} {...props} />;
  } else if (project.isError) {
    return <div>{project.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function ProjectRendererWithData({ project }: { project: ProjectRead }) {
  return <>Project: {project.title}</>;
}
