import { useSuspenseQuery } from "@tanstack/react-query";
import { CotaViewContent } from "./_components/CotaViewContent";
import { CotaRouteAPI } from "./_hooks/cotaRouteAPI";

export function CotaView() {
  const { projectId, cotaId } = CotaRouteAPI.useParams();
  const { cotasByProjectOptions } = CotaRouteAPI.useRouteContext();

  const { data: cota } = useSuspenseQuery({
    ...cotasByProjectOptions,
    select: (data) => data[cotaId],
  });

  return <CotaViewContent key={`${projectId}-${cotaId}`} cota={cota} />;
}
