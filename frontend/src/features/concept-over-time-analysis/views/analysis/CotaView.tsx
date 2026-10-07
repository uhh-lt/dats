import { cotaQueries } from "@api/queries/cotaQueries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CotaViewContent } from "./_components/CotaViewContent";
import { CotaRouteAPI } from "./_hooks/cotaRouteAPI";

export function CotaView() {
  const { projectId, cotaId } = CotaRouteAPI.useParams();

  const { data: cota } = useSuspenseQuery({
    ...cotaQueries.byProjectRequired(projectId),
    select: (data) => data[cotaId],
  });

  return <CotaViewContent key={`${projectId}-${cotaId}`} cota={cota} />;
}
