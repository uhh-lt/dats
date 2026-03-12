import { QueryKey } from "@api/hooks/QueryKey";
import { TimelineAnalysisRead } from "@api/models/TimelineAnalysisRead";
import { TimelineAnalysisType } from "@api/models/TimelineAnalysisType";
import { SearchService } from "@api/services/SearchService";
import { ColumnInfo } from "@core/filter";
import { AppDispatch } from "@store/store";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { TimelineAnalysisActions } from "../../../store/timelineAnalysisSlice";

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
