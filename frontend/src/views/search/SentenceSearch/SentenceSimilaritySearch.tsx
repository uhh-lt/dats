import { Divider, Grid, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { SimSearchSentenceHit } from "../../../api/openapi/models/SimSearchSentenceHit.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { MyFilter, createEmptyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import DocumentInformation from "../../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import TagExplorerNew from "../../../components/Tag/TagExplorer/TagExplorer.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../annotation/annoSlice.ts";
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

  // hack to disable sentences
  const projectCodes = ProjectHooks.useGetAllCodes(projectId, true);
  useEffect(() => {
    if (projectCodes.data) {
      const sentence = projectCodes.data.find((code) => code.name === "SENTENCE");
      if (sentence) {
        dispatch(AnnoActions.disableCode(sentence.id));
      }
    }
  }, [dispatch, projectCodes.data]);

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
          query: searchQuery,
          threshold: threshold,
          top_k: topK,
        },
      }),
  });
  const sdocIds = useMemo(() => data?.map((hit) => hit.sdoc_id) || [], [data]);

  // render
  return (
    <>
      <Grid container className="h100">
        <Grid
          item
          md={2}
          className="h100"
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: (theme) => theme.palette.background.paper,
            borderRight: "1px solid #e8eaed",
            boxShadow: 4,
          }}
        >
          <TagExplorerNew sx={{ height: "50%", pt: 0 }} onTagClick={handleAddTagFilter} />
          <Divider />
          <SearchStatistics
            sx={{ height: "50%" }}
            sdocIds={sdocIds}
            handleKeywordClick={handleAddKeywordFilter}
            handleTagClick={handleAddTagFilter}
            handleCodeClick={handleAddCodeFilter}
          />
        </Grid>
        <Grid
          item
          md={8}
          className="h100"
          p={2}
          sx={{ backgroundColor: (theme) => theme.palette.grey[200], overflow: "auto" }}
        >
          <SentenceSimilaritySearchTable
            projectId={projectId}
            data={data}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
          />
        </Grid>
        <Grid
          item
          md={2}
          className="h100"
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: (theme) => theme.palette.background.paper,
            borderLeft: "1px solid #e8eaed",
            boxShadow: 4,
          }}
        >
          <DocumentInformation
            sdocId={selectedDocumentId}
            filterName={filterName}
            isIdleContent={<Typography padding={2}>Click on a sentence to see info :)</Typography>}
            className="h100"
          />
        </Grid>
      </Grid>
    </>
  );
}

export default SentenceSimilaritySearch;
