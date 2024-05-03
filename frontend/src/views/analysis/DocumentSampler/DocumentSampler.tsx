import { Grid, Portal, Typography } from "@mui/material";
import { useContext, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import AnalysisHooks from "../../../api/AnalysisHooks";
import ProjectHooks from "../../../api/ProjectHooks";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead";
import { AppBarContext } from "../../../layouts/TwoBarLayout";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import TagGroupCreator from "./TagGroupCreator";
import DocumentsBarChart from "./DocumentsBarChart";
import DocumentsTable from "./DocumentsTable";
import SamplingStrategySelector from "./SamplingStrategySelector";
import { DocumentSamplerActions } from "./documentSamplerSlice";

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
      <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid item md={4} className="myFlexContainer h100">
          <TagGroupCreator
            tags={tags.data || []}
            tagsMap={tagsMap}
            aggregationGroups={aggregationGroups}
            cardProps={{ className: "myFlexFillAllContainer", sx: { mb: 2 } }}
          />
          <SamplingStrategySelector />
        </Grid>
        <Grid item md={8} className="myFlexContainer h100">
          <DocumentsBarChart cardProps={{ sx: { height: "50%", mb: 2 } }} onChartRefresh={onAggregate} />
          <DocumentsTable cardProps={{ style: { height: "50%" } }} onTableRefresh={onAggregate} />
        </Grid>
      </Grid>
    </>
  );
}

export default DocumentSampler;
