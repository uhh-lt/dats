import { PerspectivesQueryOptions } from "./perspectivesQueryOptions";
import { SdocColumns } from "@api/models/SdocColumns";
import { MyFilter } from "@core/filter";
import { useAppSelector } from "@store/storeHooks";

export const useGetDocVisualization = (aspectId: number) => {
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return PerspectivesQueryOptions.useGetDocVisualization(aspectId, searchQuery, filter as MyFilter<SdocColumns>);
};
