import { CotaHooks } from "@api/hooks/CotaHooks";
import { CircularProgress } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { CotaViewContent } from "./_components/CotaViewContent";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/concepts-over-time-analysis/$cotaId");

export function CotaView() {
  // global client state
  const { projectId, cotaId } = routeApi.useParams();

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
