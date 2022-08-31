import React, { useContext, useEffect, useMemo } from "react";
import { Box, Grid } from "@mui/material";
import MemoExplorer from "./MemoExplorer";
import { useParams } from "react-router-dom";
import Portal from "@mui/material/Portal";
import SearchBar from "../search/SearchBar/SearchBar";
import MemoResults from "./MemoResults";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useForm } from "react-hook-form";
import UserHooks from "../../api/UserHooks";
import { useAuth } from "../../auth/AuthProvider";
import SearchHooks from "../../api/SearchHooks";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { LogbookActions } from "./logbookSlice";
import "@toast-ui/editor/dist/toastui-editor.css";
import { Editor } from "@toast-ui/react-editor";

// todo: insert editor
// todo: implement recent activities timeline
function Logbook() {
  const appBarContainerRef = useContext(AppBarContext);

  // global state
  const { user } = useAuth();

  // router
  const { projectId } = useParams() as {
    projectId: string;
  };

  // global state (redux)
  const dispatch = useAppDispatch();
  const searchTerm = useAppSelector((state) => state.logbook.searchTerm);
  const category = useAppSelector((state) => state.logbook.category);

  // queries
  const searchMemos = SearchHooks.useSearchMemoContent({
    content_query: searchTerm,
    user_id: user.data!.id,
    proj_id: parseInt(projectId),
  });
  const userMemos = UserHooks.useGetAllMemos(user.data!.id);

  // computed
  // select memos based on search term (if there is no search term, show all user memos)
  const memos = useMemo(
    () => (searchTerm.trim().length > 0 ? searchMemos : userMemos),
    [searchMemos, searchTerm, userMemos]
  );

  // editor
  const editorRef = React.createRef<Editor>();

  const handleSave = () => {
    const editor = editorRef.current?.getInstance();
    if (editor) {
      console.log(editor.getMarkdown());
    }
  };

  // searchbar form
  const { register, handleSubmit, reset, setValue } = useForm();

  // init form with value from global state (redux)
  useEffect(() => {
    setValue("query", searchTerm);
  }, [setValue]); // we only want to set the value once, not every time the searchTerm changes!

  // search form handling
  const handleSearch = (data: any) => {
    const query: string = data.query;
    dispatch(LogbookActions.setSearchTerm(query));
  };

  const handleSearchError = (data: any) => console.error(data);
  const handleClearSearch = () => {
    dispatch(LogbookActions.setSearchTerm(""));
    reset();
  };

  const handleCategoryClick = (category: string | undefined) => {
    dispatch(LogbookActions.setCategory(category));
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <SearchBar
          register={register}
          handleSubmit={handleSubmit(handleSearch, handleSearchError)}
          handleClearSearch={handleClearSearch}
          placeholder="Search memos..."
        />
      </Portal>
      <Grid container columnSpacing={2} className="h100" sx={{ py: 1 }}>
        <Grid item md={2} className="h100">
          <Box className="h100" sx={{ overflowY: "auto" }}>
            <MemoExplorer
              sx={{ p: 0, whiteSpace: "nowrap", overflowX: "hidden" }}
              handleCategoryClick={handleCategoryClick}
              selectedCategory={category}
            />
          </Box>
        </Grid>
        <Grid item md={5} className="h100">
          <Box className="h100" sx={{ overflowY: "auto" }}>
            {memos.isLoading && <div>Loading!</div>}
            {memos.isError && <div>Error: {memos.error.message}</div>}
            {memos.isSuccess && <MemoResults memoIds={memos.data.map((memo) => memo.id)} filter={category} />}
          </Box>
        </Grid>
        <Grid item md={5} className="h100">
          <Box className="h100" sx={{ pr: 1 }}>
            <Editor
              initialValue="hello react editor world!"
              previewStyle="vertical"
              height="100%"
              initialEditType="wysiwyg"
              useCommandShortcut={true}
              usageStatistics={false}
              hideModeSwitch={true}
              ref={editorRef}
              onBlur={() => handleSave()}
            />
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

export default Logbook;
