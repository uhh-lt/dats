import { Grid2, Typography } from "@mui/material";
import Portal from "@mui/material/Portal";
import { useContext } from "react";
import { useParams } from "react-router-dom";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import LogbookEditor from "./LogbookEditor.tsx";
import SearchMemoTable from "./MemoSearch/SearchMemoTable.tsx";

// todo: implement recent activities timeline
function Logbook() {
  const appBarContainerRef = useContext(AppBarContext);
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          Logbook
        </Typography>
      </Portal>
      <Grid2 container spacing={2} className="h100" bgcolor={"grey.200"} p={2}>
        <Grid2 size={{ md: 6 }} className="h100">
          <SearchMemoTable projectId={projectId} />
        </Grid2>
        <Grid2 size={{ md: 6 }} className="h100">
          <LogbookEditor projectId={projectId} />
        </Grid2>
      </Grid2>
    </>
  );
}

export default Logbook;
