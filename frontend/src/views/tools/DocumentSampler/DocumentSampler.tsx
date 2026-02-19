import { useMutation } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import TagHooks from "../../../api/TagHooks.ts";
import { SampledSdocsResults } from "../../../api/openapi/models/SampledSdocsResults.ts";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import SidebarContentLayout from "../../../layouts/ContentLayouts/SidebarContentLayout.tsx";
import PercentageResizablePanel from "../../../layouts/ResizePanel/PercentageResizablePanel.tsx";
import { useLayoutPercentage } from "../../../layouts/ResizePanel/hooks/useLayoutPercentage.ts";
import { LayoutPercentageKeys } from "../../../layouts/layoutSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import DocumentsBarChart from "./DocumentsBarChart.tsx";
import DocumentsTable from "./DocumentsTable.tsx";
import SamplingStrategySelector from "./SamplingStrategySelector.tsx";
import TagGroupCreator from "./TagGroupCreator.tsx";
import { DocumentSamplerActions } from "./documentSamplerSlice.ts";

const routeApi = getRouteApi("/_auth/project/$projectId/tools/document-sampler");

function DocumentSampler() {
  // global client state (react router)
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  // global client state (redux)
  const aggregationGroups = useAppSelector((state) => state.documentSampler.aggregationGroups);
  const fixedSamplingValue = useAppSelector((state) => state.documentSampler.fixedSamplingValue);
  const relativeSamplingValue = useAppSelector((state) => state.documentSampler.relativeSamplingValue);
  const dispatch = useAppDispatch();

  // global server state
  const tags = TagHooks.useGetAllTags();
  const tagsMap = useMemo(() => {
    if (!tags.data) {
      return {};
    }
    return tags.data.reduce(
      (acc, tag) => {
        acc[tag.id] = tag;
        return acc;
      },
      {} as Record<number, TagRead>,
    );
  }, [tags.data]);

  // mutations
  const transformAndStore = useCallback(
    (data: SampledSdocsResults[]) => {
      const result = data.map((x) => {
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
    },
    [dispatch, tagsMap],
  );
  const { mutate: aggregateSdocsByTags } = useMutation({
    mutationFn: AnalysisService.sampleSdocsByTags,
    onSuccess: transformAndStore,
  });

  // actions
  const onAggregate = useCallback(() => {
    aggregateSdocsByTags({
      projectId,
      n: fixedSamplingValue,
      frac: relativeSamplingValue,
      requestBody: Object.values(aggregationGroups).map((tags) => tags.map((tag) => tag.id)),
    });
  }, [aggregateSdocsByTags, aggregationGroups, fixedSamplingValue, projectId, relativeSamplingValue]);

  // Get percentages from Redux with defaultPercentage
  const { percentage: sidebarPercentage, handleResize: handleSidebarResize } = useLayoutPercentage(
    LayoutPercentageKeys.DocumentSamplerSidebar,
  );
  const { percentage: contentPercentage, handleResize: handleContentResize } = useLayoutPercentage(
    LayoutPercentageKeys.DocumentSamplerContent,
  );

  return (
    <SidebarContentLayout
      leftSidebar={
        <PercentageResizablePanel
          firstContent={
            <TagGroupCreator
              tags={tags.data || []}
              aggregationGroups={aggregationGroups}
              cardProps={{ className: "h100" }}
            />
          }
          secondContent={<SamplingStrategySelector cardProps={{ className: "h100" }} />}
          contentPercentage={sidebarPercentage}
          onResize={handleSidebarResize}
        />
      }
      content={
        <PercentageResizablePanel
          firstContent={<DocumentsBarChart onChartRefresh={onAggregate} cardProps={{ className: "h100" }} />}
          secondContent={<DocumentsTable onTableRefresh={onAggregate} cardProps={{ className: "h100" }} />}
          contentPercentage={contentPercentage}
          onResize={handleContentResize}
        />
      }
    />
  );
}

export default DocumentSampler;
