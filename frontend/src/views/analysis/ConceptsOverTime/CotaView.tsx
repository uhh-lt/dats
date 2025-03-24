import { CircularProgress } from "@mui/material";
import { useParams } from "react-router-dom";
import CotaHooks from "../../../api/CotaHooks.ts";
import CotaViewContent from "./CotaViewContent.tsx";

function CotaView() {
  // global client state
  const urlParams = useParams() as { projectId: string; cotaId: string };
  const projectId = parseInt(urlParams.projectId);
  const cotaId = parseInt(urlParams.cotaId);

  // global server state
  const cota = CotaHooks.useGetCota(cotaId);

  return (
    <>
      {cota.isSuccess ? (
        <CotaViewContent key={`${projectId}-${cotaId}`} cota={cota.data} />
      ) : cota.isLoading ? (
        <CircularProgress />
      ) : cota.isError ? (
        <div>ERROR: {cota.error.message}</div>
      ) : null}
    </>
  );
}

export default CotaView;
