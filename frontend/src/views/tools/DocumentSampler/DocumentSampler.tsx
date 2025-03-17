import { useMutation } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import TagHooks from "../../../api/TagHooks.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { SampledSdocsResults } from "../../../api/openapi/models/SampledSdocsResults.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import SidebarContentLayout from "../../../layouts/ContentLayouts/SidebarContentLayout.tsx";
import { VerticalPercentageResizablePanel } from "../../../layouts/ResizePanel/VerticalPercentageResizablePanel.tsx";
import { useVerticalPercentage } from "../../../layouts/ResizePanel/hooks/useVerticalPercentage.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import DocumentsBarChart from "./DocumentsBarChart.tsx";
import DocumentsTable from "./DocumentsTable.tsx";
import SamplingStrategySelector from "./SamplingStrategySelector.tsx";
import TagGroupCreator from "./TagGroupCreator.tsx";
import { DocumentSamplerActions } from "./documentSamplerSlice.ts";

const SIDEBAR_NAME = "document-sampler-sidebar";
const CONTENT_NAME = "document-sampler-content";

function DocumentSampler() {
  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

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
      {} as Record<number, DocumentTagRead>,
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

  // vertical percentages
  const { percentage: sidebarPercentage, handleResize: handleSidebarResize } = useVerticalPercentage(SIDEBAR_NAME);
  const { percentage: contentPercentage, handleResize: handleContentResize } = useVerticalPercentage(CONTENT_NAME);

  return (
    <SidebarContentLayout
      leftSidebar={
        <VerticalPercentageResizablePanel
          topContent={
            <TagGroupCreator
              tags={tags.data || []}
              aggregationGroups={aggregationGroups}
              cardProps={{ className: "h100" }}
            />
          }
          bottomContent={<SamplingStrategySelector cardProps={{ elevation: 0 }} />}
          verticalContentPercentage={sidebarPercentage}
          onResize={handleSidebarResize}
        />
      }
      content={
        <VerticalPercentageResizablePanel
          topContent={<DocumentsBarChart onChartRefresh={onAggregate} cardProps={{ className: "h100" }} />}
          bottomContent={<DocumentsTable onTableRefresh={onAggregate} cardProps={{ className: "h100" }} />}
          verticalContentPercentage={contentPercentage}
          onResize={handleContentResize}
        />
      }
    />
  );
}

export default DocumentSampler;
