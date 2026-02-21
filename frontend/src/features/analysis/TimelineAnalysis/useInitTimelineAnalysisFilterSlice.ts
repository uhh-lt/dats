import { useQuery } from "@tanstack/react-query";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import { TimelineAnalysisType } from "../../../api/openapi/models/TimelineAnalysisType.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { ColumnInfo } from "../../../components/FilterDialog/filterUtils.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AppDispatch } from "../../../store/store.ts";
import { TimelineAnalysisActions } from "./timelineAnalysisSlice.ts";

const useGetTimelineAnalysisInfo = (timelineAnalysis: TimelineAnalysisRead, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: [
      QueryKey.TABLE_INFO,
      "timelineAnalysis",
      timelineAnalysis.project_id,
      timelineAnalysis.timeline_analysis_type,
      timelineAnalysis.id,
    ],
    queryFn: async () => {
      const projectId = timelineAnalysis.project_id;
      let columnInfo: ColumnInfo[] = [];
      switch (timelineAnalysis.timeline_analysis_type) {
        case TimelineAnalysisType.DOCUMENT: {
          const sdocInfo = await SearchService.searchSdocInfo({ projectId });
          columnInfo = sdocInfo.map((info) => {
            return {
              ...info,
              column: info.column.toString(),
            };
          });
          break;
        }
        case TimelineAnalysisType.BBOX_ANNOTATION: {
          const bboxInfo = await SearchService.searchBboxAnnotationInfo({ projectId });
          columnInfo = bboxInfo.map((info) => {
            return {
              ...info,
              column: info.column.toString(),
            };
          });
          break;
        }
        case TimelineAnalysisType.SENTENCE_ANNOTATION: {
          const sentAnnoInfo = await SearchService.searchSentenceAnnotationInfo({ projectId });
          columnInfo = sentAnnoInfo.map((info) => {
            return {
              ...info,
              column: info.column.toString(),
            };
          });
          break;
        }
        case TimelineAnalysisType.SPAN_ANNOTATION: {
          const spanAnnoInfo = await SearchService.searchSpanAnnotationInfo({ projectId });
          columnInfo = spanAnnoInfo.map((info) => {
            return {
              ...info,
              column: info.column.toString(),
            };
          });
          break;
        }
        default:
          break;
      }

      const columnInfoMap: Record<string, ColumnInfo> = columnInfo.reduce((acc, info) => {
        return {
          ...acc,
          [info.column]: info,
        };
      }, {});
      dispatch(TimelineAnalysisActions.init({ columnInfoMap }));
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitTimelineAnalysisFilterSlice = ({
  timelineAnalysis,
}: {
  timelineAnalysis: TimelineAnalysisRead;
}) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetTimelineAnalysisInfo(timelineAnalysis, dispatch);

  return columnData;
};
