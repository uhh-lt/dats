import { metadataQueries } from "@api/queries/metadataQueries";
import { searchQueries } from "@api/queries/searchQueries";
import { MyFilter } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";

interface DocumentSearchViewSearch {
  searchQuery: string;
  filter: MyFilter<SdocColumns>;
  searchExpertMode: boolean;
  selectedFolderId: number;
  sortingModel: { id: string; desc: boolean }[];
  fetchSize: number;
  showFolders: boolean;
  showChildFolders: boolean;
}

/**
 * The query options of the document search view. The route puts them into its context, the loader and the view use them,
 * so both always fetch exactly the same data.
 */
export const documentSearchViewOptions = (projectId: number, search: DocumentSearchViewSearch) => ({
  documentSearchOptions: searchQueries.documents({
    projectId,
    selectedFolderId: search.selectedFolderId,
    searchQuery: search.searchQuery,
    filter: search.filter,
    expertMode: search.searchExpertMode,
    sortingModel: search.sortingModel,
    fetchSize: search.fetchSize,
    showFolders: search.showFolders,
    showChildFolders: search.showChildFolders,
  }),
  projectMetadataOptions: metadataQueries.byProject(projectId),
});
