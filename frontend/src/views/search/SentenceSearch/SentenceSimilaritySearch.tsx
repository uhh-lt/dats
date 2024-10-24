import { Divider, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { SimSearchSentenceHit } from "../../../api/openapi/models/SimSearchSentenceHit.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { MyFilter, createEmptyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import DocumentInformation from "../../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import TagExplorer from "../../../components/Tag/TagExplorer/TagExplorer.tsx";
import TwoSidebarsLayout from "../../../layouts/TwoSidebarsLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import SearchStatistics from "../Statistics/SearchStatistics.tsx";
import { SearchFilterActions } from "../searchFilterSlice.ts";
import SentenceSimilaritySearchTable from "./SentenceSimilaritySearchTable.tsx";

const filterName = "sentenceSimilaritySearch";

function SentenceSimilaritySearch() {
  // router
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.sentenceSearch.selectedDocumentId);
  const dispatch = useAppDispatch();

  // filter
  const projectMetadata = ProjectHooks.useGetMetadata(projectId);

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata.data]);

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      dispatch(
        SearchFilterActions.onAddSpanAnnotationFilter({ codeId: stat.code_id, spanText: stat.span_text, filterName }),
      );
    },
    [dispatch],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      dispatch(SearchFilterActions.onAddKeywordFilter({ keywordMetadataIds, keyword, filterName }));
    },
    [dispatch, keywordMetadataIds],
  );
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      dispatch(SearchFilterActions.onAddTagFilter({ tagId, filterName }));
    },
    [dispatch],
  );

  // search
  const filter = useAppSelector((state) => state.searchFilter.filter[filterName]) || createEmptyFilter(filterName);
  const topK = useAppSelector((state) => state.sentenceSearch.topK);
  const threshold = useAppSelector((state) => state.sentenceSearch.threshold);
  const searchQuery = useAppSelector((state) => state.sentenceSearch.searchQuery);
  const { data, isError, isFetching, isLoading } = useQuery<SimSearchSentenceHit[]>({
    queryKey: [
      "sentence-similarity-search",
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      topK,
      threshold,
    ],
    queryFn: () =>
      SearchService.findSimilarSentences({
        requestBody: {
          filter: filter as MyFilter<SearchColumns>,
          proj_id: projectId,
          query: searchQuery || "",
          threshold: threshold,
          top_k: topK,
        },
      }),
  });
  const sdocIds = useMemo(() => data?.map((hit) => hit.sdoc_id) || [], [data]);

  // render
  return (
    <TwoSidebarsLayout
      leftSidebar={
        <>
          <TagExplorer sx={{ height: "50%", pt: 0 }} onTagClick={handleAddTagFilter} />
          <Divider />
          <SearchStatistics
            sx={{ height: "50%" }}
            sdocIds={sdocIds}
            handleKeywordClick={handleAddKeywordFilter}
            handleTagClick={handleAddTagFilter}
            handleCodeClick={handleAddCodeFilter}
          />
        </>
      }
      content={
        <SentenceSimilaritySearchTable
          projectId={projectId}
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
        />
      }
      rightSidebar={
        <DocumentInformation
          sdocId={selectedDocumentId}
          filterName={filterName}
          isIdleContent={<Typography padding={2}>Click on a sentence to see info :)</Typography>}
          className="h100"
        />
      }
    />
  );
}

export default SentenceSimilaritySearch;
