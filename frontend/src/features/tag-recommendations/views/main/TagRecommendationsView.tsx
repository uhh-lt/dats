import { ContentContainerLayout } from "@components/content-layouts";
import { jobStatusToSimple } from "@core/job";
import { getIconComponent, Icon } from "@components/icons";
import { TagHooks } from "@core/tag";
import { TagRead } from "@models/TagRead";
import { TagRecommendationMethod } from "@models/TagRecommendationMethod";
import { TagRecommendationResult } from "@models/TagRecommendationResult";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { TagRecommendationHooks } from "../../api/tagRecommendationHooks";
import { tagRecommendationQueries } from "../../api/tagRecommendationQueries";
// TODO: This feature needs its own components or rework in general
// eslint-disable-next-line local/no-internal-modules-public-entry, boundaries/element-types
import { DocumentTaggingResultRow } from "@features/llm-assistant/views/dialog/_components/document-tagging-result-step/DocumentTaggingResultRow";
// eslint-disable-next-line local/no-internal-modules-public-entry, boundaries/element-types
import { DocumentTagResultStepTable } from "@features/llm-assistant/views/dialog/_components/document-tagging-result-step/DocumentTagResultStepTable";
import {
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  Toolbar,
} from "@mui/material";
import { useCallback, useState } from "react";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/tag-recommendations");

export function TagRecommendationsView() {
  const { projectId } = routeApi.useParams();

  // local state
  const [selectedJobId, setSelectedJobId] = useState<string>("-1");
  const [method, setMethod] = useState<TagRecommendationMethod>(TagRecommendationMethod.KNN);
  const [multiClass, setMultiClass] = useState(false);

  // global server state
  const documentTags = TagHooks.useGetAllTags();
  const tagRecommendationJobs = useQuery(tagRecommendationQueries.job.byProject(projectId));
  const selectedJob = tagRecommendationJobs.data?.find((job) => job.job_id === selectedJobId);
  const selectedJobState = selectedJob ? jobStatusToSimple[selectedJob.status] : undefined;
  // the recommendations exist once the job finished (cache-sync refetches them then)
  const recommendations = useQuery(
    tagRecommendationQueries.byJob(selectedJobState === "finished" ? selectedJobId : null),
  );
  const startJob = TagRecommendationHooks.useStartTagRecommendationJob();

  // event handlers
  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelectedJobId(event.target.value);
  };
  const handleMethodChange = (event: SelectChangeEvent<TagRecommendationMethod>) => {
    const selected = Object.values(TagRecommendationMethod).find((value) => value === event.target.value);
    if (selected) setMethod(selected);
  };
  const handleStart = () => {
    startJob.mutate(
      { requestBody: { project_id: projectId, method, multi_class: multiClass } },
      { onSuccess: (job) => setSelectedJobId(job.job_id) },
    );
  };

  return (
    <ContentContainerLayout>
      <Card className="myFlexContainer h100">
        <Toolbar sx={{ gap: 2 }}>
          <FormControl size="small">
            <InputLabel id="tag-recommendation-method-label">Method</InputLabel>
            <Select
              labelId="tag-recommendation-method-label"
              label="Method"
              value={method}
              onChange={handleMethodChange}
            >
              {Object.values(TagRecommendationMethod).map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={multiClass} onChange={(event) => setMultiClass(event.target.checked)} />}
            label="Multiple tags per document"
          />
          <Button
            variant="contained"
            startIcon={getIconComponent(Icon.TAG_RECOMMENDATION)}
            onClick={handleStart}
            loading={startJob.isPending}
            loadingPosition="start"
          >
            Recommend tags
          </Button>
          <FormControl>
            <InputLabel id="tag-recommendation-job-select-label">Job Selection</InputLabel>
            <Select
              labelId="tag-recommendation-job-select-label"
              label="Job Selection"
              value={selectedJobId}
              onChange={handleChange}
              fullWidth
              size="small"
            >
              <MenuItem key={"-1"} value={"-1"}>
                <ListItemText>Select a recommendation job</ListItemText>
              </MenuItem>
              {tagRecommendationJobs.data?.map((job) => (
                <MenuItem key={job.job_id} value={job.job_id}>
                  <ListItemText primary={new Date(job.created).toLocaleString()} secondary={job.status} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Toolbar>
        {tagRecommendationJobs.isError ? (
          <CardContent>The tag recommendation jobs could not be loaded.</CardContent>
        ) : selectedJobState === "running" ? (
          <CardContent>The tag recommendation job is running. Its recommendations appear when it finishes.</CardContent>
        ) : selectedJobState === "error" ? (
          <CardContent>
            The tag recommendation job did not finish ({selectedJob?.status}).
            {selectedJob?.status_message ? ` Message: ${selectedJob.status_message}` : ""}
          </CardContent>
        ) : recommendations.isError ? (
          <CardContent>The recommendations could not be loaded.</CardContent>
        ) : recommendations.isLoading || documentTags.isLoading ? (
          <CardContent>Loading the recommendations...</CardContent>
        ) : documentTags.data && recommendations.data && recommendations.data.length > 0 ? (
          <TagRecommendationsContent
            key={selectedJobId}
            projectId={projectId}
            results={recommendations.data}
            tags={documentTags.data}
          />
        ) : recommendations.data ? (
          <CardContent>No recommendations left to review: you reviewed them all, or the job found none.</CardContent>
        ) : null}
      </Card>
    </ContentContainerLayout>
  );
}

interface TagRecommendationResultRow extends DocumentTaggingResultRow {
  recommendation_ids: number[];
}

function TagRecommendationsContent({
  projectId,
  results,
  tags,
}: {
  projectId: number;
  results: TagRecommendationResult[];
  tags: TagRead[];
}) {
  // local client state
  const [rows, setRows] = useState<TagRecommendationResultRow[]>(() => {
    const tagId2Tag = tags.reduce(
      (acc, tag) => {
        acc[tag.id] = tag;
        return acc;
      },
      {} as Record<number, TagRead>,
    );
    return results.map((result) => {
      return {
        sdocId: result.sdoc_id,
        current_tags: result.current_tag_ids.map((tagId) => tagId2Tag[tagId]),
        suggested_tags: result.suggested_tag_ids.map((tagId) => tagId2Tag[tagId]),
        merged_tags: result.current_tag_ids.map((tagId) => tagId2Tag[tagId]),
        reasoning: result.suggested_tag_ids
          .map((tagId, index) => `${tagId2Tag[tagId]?.name ?? tagId}: similarity ${result.scores[index]?.toFixed(2)}`)
          .join(", "),
        recommendation_ids: result.recommendation_ids,
      };
    });
  });

  // actions
  const { mutate: applyTagsMutation, isPending: isUpdatePending } = TagHooks.useBulkSetTags();
  const { mutate: reviewTagsMutation, isPending: isReviewPending } =
    TagRecommendationHooks.useReviewTagRecommendations();
  const handleApplyNewTags = useCallback(() => {
    applyTagsMutation({
      projectId,
      requestBody: {
        links: Object.fromEntries(rows.map((row) => [row.sdocId, row.merged_tags.map((tag) => tag.id)])),
      },
    });
    reviewTagsMutation({
      requestBody: rows.map((row) => row.recommendation_ids).flat(),
    });
  }, [applyTagsMutation, projectId, rows, reviewTagsMutation]);

  return (
    <>
      <DocumentTagResultStepTable rows={rows} onUpdateRows={setRows} />
      <Stack sx={{ p: 2 }}>
        <Button
          variant="contained"
          startIcon={getIconComponent(Icon.TAG)}
          onClick={handleApplyNewTags}
          loading={isUpdatePending || isReviewPending}
          loadingPosition="start"
        >
          Apply Final Tags
        </Button>
      </Stack>
    </>
  );
}
