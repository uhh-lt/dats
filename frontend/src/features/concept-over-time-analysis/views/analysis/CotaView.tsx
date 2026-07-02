import { useSuspenseQuery } from "@tanstack/react-query";
import { projectCotasQueryOptions } from "../../_api/cotaQueryOptions";
import { CotaViewContent } from "./_components/CotaViewContent";
import { CotaRouteAPI } from "./_hooks/cotaRouteAPI";

export function CotaView() {
  const { projectId, cotaId } = CotaRouteAPI.useParams();

  const { data: cota } = useSuspenseQuery({
    ...projectCotasQueryOptions(projectId),
    select: (data) => data[cotaId],
  });

  return <CotaViewContent key={`${projectId}-${cotaId}`} cota={cota} />;
}
