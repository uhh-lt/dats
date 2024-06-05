import { Box, Portal, Stack, Typography } from "@mui/material";
import { useContext, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import AnalysisHooks from "../../../api/AnalysisHooks.ts";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import OneSidebarLayout from "../../../layouts/OneSidebarLayout.tsx";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import DocumentsBarChart from "./DocumentsBarChart.tsx";
import DocumentsTable from "./DocumentsTable.tsx";
import SamplingStrategySelector from "./SamplingStrategySelector.tsx";
import TagGroupCreator from "./TagGroupCreator.tsx";
import { DocumentSamplerActions } from "./documentSamplerSlice.ts";

function DocumentSampler() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const aggregationGroups = useAppSelector((state) => state.documentSampler.aggregationGroups);
  const fixedSamplingValue = useAppSelector((state) => state.documentSampler.fixedSamplingValue);
  const relativeSamplingValue = useAppSelector((state) => state.documentSampler.relativeSamplingValue);
  const dispatch = useAppDispatch();

  const tags = ProjectHooks.useGetAllTags(projectId);
  const tagsMap = useMemo(() => {
    if (!tags.data) {
      return {};
    }
    return tags.data.reduce(
      (acc, tag) => {
        acc[tag.id] = tag;
        return acc;
      },
      {} as Record<number, DocumentTagRead>,
    );
  }, [tags.data]);

  // request the aggregation
  const { mutate: aggregateSdocsByTags, data: aggregatedSdocsByTags } = AnalysisHooks.useSampleSdocsByTags();

  // transform & store the mutation result
  useEffect(() => {
    if (!aggregatedSdocsByTags) {
      dispatch(DocumentSamplerActions.onUpdateChartData([]));
    } else {
      const result = aggregatedSdocsByTags.map((x) => {
        return {
          tags: x.tags.map((tagId) => tagsMap[tagId]),
          count: x.sdocs.length,
          sdocIds: x.sdocs,
          fixedSampleSdocIds: x.sample_fixed,
          fixedSampleCount: x.sample_fixed.length,
          relativeSampleSdocIds: x.sample_relative,
          relativeSampleCount: x.sample_relative.length,
        };
      });
      dispatch(DocumentSamplerActions.onUpdateChartData(result));
    }
  }, [dispatch, aggregatedSdocsByTags, tagsMap]);

  // actions
  const onAggregate = () => {
    aggregateSdocsByTags({
      projectId,
      n: fixedSamplingValue,
      frac: relativeSamplingValue,
      requestBody: Object.values(aggregationGroups).map((tags) => tags.map((tag) => tag.id)),
    });
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Document Sampler
        </Typography>
      </Portal>
      <OneSidebarLayout
        leftSidebar={
          <Box className="h100 myFlexContainer">
            <TagGroupCreator
              tags={tags.data || []}
              aggregationGroups={aggregationGroups}
              cardProps={{ className: "myFlexFillAllContainer", sx: { mb: 2 }, elevation: 0 }}
            />
            <SamplingStrategySelector cardProps={{ elevation: 0 }} />
          </Box>
        }
        content={
          <Stack className="h100" p={2} spacing={2}>
            <DocumentsBarChart cardProps={{ sx: { height: "50%" } }} onChartRefresh={onAggregate} />
            <DocumentsTable cardProps={{ sx: { height: "50%" } }} onTableRefresh={onAggregate} />
          </Stack>
        }
      />
    </>
  );
}

export default DocumentSampler;
