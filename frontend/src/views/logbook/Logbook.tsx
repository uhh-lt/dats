import { Grid2 } from "@mui/material";
import Portal from "@mui/material/Portal";
import { useContext } from "react";
import { useParams } from "react-router-dom";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import SearchMemoTable from "./MemoSearch/SearchMemoTable.tsx";

// todo: implement recent activities timeline
function Logbook() {
  const appBarContainerRef = useContext(AppBarContext);
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>Logbook</Portal>
      <Grid2 container spacing={2} className="h100" bgcolor={"grey.200"} p={2}>
        <Grid2 size={{ md: 6 }} className="h100">
          <SearchMemoTable projectId={projectId} />
        </Grid2>
        <Grid2 size={{ md: 6 }} className="h100">
          <div>Editor currently not supported</div>
        </Grid2>
      </Grid2>
    </>
  );
}

export default Logbook;
