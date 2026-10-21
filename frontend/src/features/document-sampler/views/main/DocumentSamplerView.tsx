import { SidebarContentLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { SampledSdocsResults } from "@models/SampledSdocsResults";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import { DocumentSamplerHooks } from "../../api/documentSamplerHooks";
import { DocumentSamplerActions } from "../../store/documentSamplerSlice";
import { DocumentsBarChart } from "./_components/DocumentsBarChart";
import { DocumentsTable } from "./_components/DocumentsTable";
import { SamplingStrategySelector } from "./_components/SamplingStrategySelector";
import { TagGroupCreator } from "./_components/TagGroupCreator";

const routeApi = getRouteApi("/_auth/project/$projectId/tools/document-sampler");

export function DocumentSamplerView() {
  // global client state (react router)
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  // global client state (redux)
  const aggregationGroups = useAppSelector((state) => state.documentSampler.aggregationGroups);
  const fixedSamplingValue = useAppSelector((state) => state.documentSampler.fixedSamplingValue);
  const relativeSamplingValue = useAppSelector((state) => state.documentSampler.relativeSamplingValue);
  const dispatch = useAppDispatch();

  // mutations
  const transformAndStore = useCallback(
    (data: SampledSdocsResults[]) => {
      const result = data.map((x) => {
        return {
          tagIds: x.tags,
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
    [dispatch],
  );
  const { mutate: aggregateSdocsByTags } = DocumentSamplerHooks.useSampleSdocsByTags({ onSuccess: transformAndStore });

  // actions
  const onAggregate = useCallback(() => {
    aggregateSdocsByTags({
      projectId,
      n: fixedSamplingValue,
      frac: relativeSamplingValue,
      requestBody: Object.values(aggregationGroups),
    });
  }, [aggregateSdocsByTags, aggregationGroups, fixedSamplingValue, projectId, relativeSamplingValue]);

  // Get percentages from Redux with defaultPercentage
  const { percentage: sidebarPercentage, handleResize: handleSidebarResize } =
    useLayoutPercentage("document-sampler-sidebar");
  const { percentage: contentPercentage, handleResize: handleContentResize } =
    useLayoutPercentage("document-sampler-content");

  return (
    <SidebarContentLayout
      sidebar={
        <PercentageResizablePanel
          firstContent={<TagGroupCreator aggregationGroups={aggregationGroups} cardProps={{ className: "h100" }} />}
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
