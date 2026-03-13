import { TagHooks } from "@api/hooks/TagHooks";
import { TagRecommendationHooks } from "@api/hooks/TagRecommendationHooks";
import { TagRead } from "@api/models/TagRead";
import { TagRecommendationResult } from "@api/models/TagRecommendationResult";
import { ContentContainerLayout } from "@components/content-layouts";
// eslint-disable-next-line local/no-internal-modules-public-entry, boundaries/element-types
import { DocumentTaggingResultRow } from "@features/llm-assistant/views/dialog/_components/document-tagging-result-step/DocumentTaggingResultRow";
// eslint-disable-next-line local/no-internal-modules-public-entry, boundaries/element-types
import { DocumentTagResultStepTable } from "@features/llm-assistant/views/dialog/_components/document-tagging-result-step/DocumentTagResultStepTable";
import {
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Toolbar,
} from "@mui/material";
import { getIconComponent, Icon } from "@utils/icons/iconUtils";
import { useCallback, useState } from "react";

export function TagRecommendationsView() {
  // local state
  const [selectedJobId, setSelectedJobId] = useState<string>("-1");

  // global server state
  const documentTags = TagHooks.useGetAllTags();
  const tagRecommendationMlJobs = TagRecommendationHooks.useGetAllTagRecommendationJobs();
  const recommendations = TagRecommendationHooks.useGetTagRecommendationsFromJob(
    selectedJobId === "-1" ? null : selectedJobId,
  );

  // event handlers
  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelectedJobId(event.target.value);
  };

  return (
    <ContentContainerLayout>
      <Card className="myFlexContainer h100">
        <Toolbar>
          <FormControl>
            <InputLabel id="ml-job-select-label">Job Selection</InputLabel>
            <Select
              labelId="ml-job-select-label"
              label="Job Selection"
              value={selectedJobId}
              onChange={handleChange}
              fullWidth
              size="small"
            >
              <MenuItem key={"-1"} value={"-1"}>
                <ListItemText>Select a recommendation job</ListItemText>
              </MenuItem>
              {tagRecommendationMlJobs.data?.map((mlJob) => (
                <MenuItem key={mlJob.job_id} value={mlJob.job_id}>
                  <ListItemText>{mlJob.job_id}</ListItemText>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Toolbar>
        {documentTags.data && recommendations.data && recommendations.data.length > 0 ? (
          <TagRecommendationsContent results={recommendations.data} tags={documentTags.data} />
        ) : documentTags.data && recommendations.data && recommendations.data.length === 0 ? (
          <CardContent>
            You Processed all recommendations! (Or there were no recommendations in the first place...)
          </CardContent>
        ) : null}
      </Card>
    </ContentContainerLayout>
  );
}

interface TagRecommendationResultRow extends DocumentTaggingResultRow {
  recommendation_ids: number[];
}

function TagRecommendationsContent({ results, tags }: { results: TagRecommendationResult[]; tags: TagRead[] }) {
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
        reasoning: "Test",
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
      requestBody: rows.map((row) => ({
        source_document_id: row.sdocId,
        tag_ids: row.merged_tags.map((tag) => tag.id),
      })),
    });
    reviewTagsMutation({
      requestBody: rows.map((row) => row.recommendation_ids).flat(),
    });
  }, [applyTagsMutation, rows, reviewTagsMutation]);

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
