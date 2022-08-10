import React, { useContext, useEffect } from "react";
import { Box, Grid } from "@mui/material";
import MemoExplorer from "../../features/memo-explorer/MemoExplorer";
import { useNavigate, useParams } from "react-router-dom";
import Portal from "@mui/material/Portal";
import SearchBar from "../search/SearchBar/SearchBar";
import MemoResults from "../../features/memo-results/MemoResults";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useForm } from "react-hook-form";
import { MemoNames } from "../../features/memo-results/MemoEnumUtils";
import UserHooks from "../../api/UserHooks";

// import "@toast-ui/editor/dist/toastui-editor.css";
// import { Editor } from "@toast-ui/react-editor";

function Logbook() {
  const navigate = useNavigate();
  const appBarContainerRef = useContext(AppBarContext);

  // queries
  const memos = UserHooks.useGetAllMemos(1);

  // router
  const { projectId, category } = useParams() as {
    projectId: string;
    category: string | undefined;
  };

  // computed
  // todo: the filtering should happen in the backend?
  const filteredMemos = category
    ? memos.data?.filter((memo) => MemoNames[memo.attached_object_type].toLowerCase() === category.toLowerCase())
    : memos.data;

  // editor
  // const editorRef = React.createRef<Editor>();
  //
  // const handleSave = () => {
  //   const editor = editorRef.current?.getInstance();
  //   if (editor) {
  //     console.log(editor.getMarkdown());
  //   }
  // };

  // searchbar form
  const { register, handleSubmit, reset, setValue } = useForm();

  // search form handling
  const handleSearch = (data: any) => {
    const query: string = data.query;
    if (query.startsWith("category:")) {
      navigate(`/project/${projectId}/logbook/${query.split(":")[1].toLowerCase()}`);
    }
  };
  const handleSearchError = (data: any) => console.error(data);
  const handleClearSearch = () => {
    reset();
    navigate(`/project/${projectId}/logbook/`);
  };

  // update search query (so that current tag = tagId from url)
  useEffect(() => {
    if (category) {
      setValue("query", `category:${category.toLowerCase()}`);
    } else {
      setValue("query", ``);
    }
  }, [category, setValue]);

  const handleCategoryClick = (category: string) => {
    navigate(`/project/${projectId}/logbook/${category.toLowerCase()}`);
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
              handleAllClick={handleClearSearch}
              selectedCategory={category}
            />
          </Box>
        </Grid>
        <Grid item md={5} className="h100">
          <Box className="h100" sx={{ overflowY: "auto" }}>
            {memos.isLoading && <div>Loading!</div>}
            {memos.isError && <div>Error: {memos.error.message}</div>}
            {memos.isSuccess && filteredMemos && <MemoResults memos={filteredMemos} />}
          </Box>
        </Grid>
        <Grid item md={5} className="h100">
          <Box className="h100" sx={{ pr: 1 }}>
            Todo: Insert editor here
            {/*<Editor*/}
            {/*  initialValue="hello react editor world!"*/}
            {/*  previewStyle="vertical"*/}
            {/*  height="100%"*/}
            {/*  initialEditType="wysiwyg"*/}
            {/*  useCommandShortcut={true}*/}
            {/*  usageStatistics={false}*/}
            {/*  hideModeSwitch={true}*/}
            {/*  ref={editorRef}*/}
            {/*  onBlur={() => handleSave()}*/}
            {/*/>*/}
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

export default Logbook;
