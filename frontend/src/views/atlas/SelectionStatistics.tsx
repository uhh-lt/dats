import { useCallback, useMemo } from "react";
import MetadataHooks from "../../api/MetadataHooks.ts";
import { SpanEntityStat } from "../../api/openapi/models/SpanEntityStat.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import SearchStatistics from "../search/Statistics/SearchStatistics.tsx";
import { AtlasActions } from "./atlasSlice.ts";

interface SelectionStatisticsProps {
  aspectId: number;
}

function SelectionStatistics({ aspectId }: SelectionStatisticsProps) {
  // global client state
  const selectedSdocIds = useAppSelector((state) => state.atlas.selectedSdocIds);

  // filter
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata.data]);

  // handle filtering
  const dispatch = useAppDispatch();
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      dispatch(
        AtlasActions.onAddSpanAnnotationFilter({
          codeId: stat.code_id,
          spanText: stat.span_text,
          filterName: `aspect-${aspectId}`,
        }),
      );
    },
    [aspectId, dispatch],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      console.log("Adding keyword filter", keyword);
      dispatch(AtlasActions.onAddKeywordFilter({ keywordMetadataIds, keyword, filterName: `aspect-${aspectId}` }));
    },
    [aspectId, dispatch, keywordMetadataIds],
  );
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      dispatch(AtlasActions.onAddTagFilter({ tagId, filterName: `aspect-${aspectId}` }));
    },
    [aspectId, dispatch],
  );

  return (
    <SearchStatistics
      className="h100"
      sdocIds={selectedSdocIds}
      handleKeywordClick={handleAddKeywordFilter}
      handleTagClick={handleAddTagFilter}
      handleCodeClick={handleAddCodeFilter}
    />
  );
}

export default SelectionStatistics;
