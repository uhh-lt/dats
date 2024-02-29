import { Box, Grid } from "@mui/material";
import Portal from "@mui/material/Portal";
import { useContext, useEffect, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks.ts";
import SearchHooks from "../../api/SearchHooks.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { UNUSED_MEMO_TYPES } from "../../utils/GlobalConstants.ts";
import MemoResults from "./MemoResults.tsx";
import MemoSearchBar from "./MemoSearchBar.tsx";
import { LogbookActions } from "./logbookSlice.ts";

export interface LogbookSearchForm {
  query: string;
}

// todo: implement recent activities timeline
function Logbook() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state
  const { user } = useAuth();

  // router
  const { projectId } = useParams() as {
    projectId: string;
  };

  // global client state (redux)
  const dispatch = useAppDispatch();
  const searchTerm = useAppSelector((state) => state.logbook.searchTerm);
  const categories = useAppSelector((state) => state.logbook.categories);
  const starred = useAppSelector((state) => state.logbook.starred);

  // global server state (react-query)
  const searchMemos = SearchHooks.useSearchMemoContent({
    content_query: searchTerm,
    user_id: user!.id,
    proj_id: parseInt(projectId),
    starred: starred,
  });
  const userMemos = ProjectHooks.useGetAllUserMemos(parseInt(projectId), user!.id);

  // computed
  // select memos based on search term (if there is no search term, show all user memos)
  // filter out memos that are not supported yet
  const memos = useMemo(
    () => (searchTerm.trim().length > 0 ? searchMemos : userMemos),
    [searchMemos, searchTerm, userMemos],
  );

  // searchbar form
  const { register, handleSubmit, reset, setValue } = useForm<LogbookSearchForm>();

  // init form with value from global state (redux)
  useEffect(() => {
    setValue("query", searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setValue]); // we only want to set the value once, not every time the searchTerm changes!

  // search form handling
  const handleSearch: SubmitHandler<LogbookSearchForm> = (data) => {
    const query: string = data.query;
    dispatch(LogbookActions.setSearchTerm(query));
  };

  const handleSearchError: SubmitErrorHandler<LogbookSearchForm> = (data) => console.error(data);
  const handleClearSearch = () => {
    dispatch(LogbookActions.setSearchTerm(""));
    reset();
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <MemoSearchBar
          register={register}
          handleSubmit={handleSubmit(handleSearch, handleSearchError)}
          handleClearSearch={handleClearSearch}
          placeholder="Search memos..."
        />
      </Portal>
      <Grid container columnSpacing={2} className="h100" sx={{ py: 1 }}>
        <Grid item md={6} className="h100">
          {memos.isLoading && <div>Loading!</div>}
          {memos.isError && <div>Error: {memos.error.message}</div>}
          {memos.isSuccess && (
            <MemoResults
              sx={{ pl: 1 }}
              memoIds={memos.data
                .filter((m) => !UNUSED_MEMO_TYPES.includes(m.attached_object_type))
                .filter((m) => categories.includes(m.attached_object_type))
                .map((memo) => memo.id)}
              noResultsText={`No memos match your query "${searchTerm}" :(`}
            />
          )}
        </Grid>
        <Grid item md={6} className="h100">
          <Box className="h100" sx={{ pr: 1 }}>
            <div>Editor currently not supported</div>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

export default Logbook;
