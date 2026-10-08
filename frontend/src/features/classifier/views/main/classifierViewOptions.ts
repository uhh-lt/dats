import { classifierQueries } from "@api/queries/classifierQueries";
import { jobQueries } from "@api/queries/jobQueries";

/** The query options of the classifier view. The route puts them into its context, the loader and the view use them. */
export const classifierViewOptions = (projectId: number) => ({
  classifiersOptions: classifierQueries.byProject(projectId),
  classifierJobsOptions: jobQueries.classifier.byProject(projectId),
});
