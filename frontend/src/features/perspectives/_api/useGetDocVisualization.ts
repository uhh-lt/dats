import { MyFilter } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";
import { useAppSelector } from "@store/storeHooks";
import { PerspectivesQueryOptions } from "./perspectivesQueryOptions";

export const useGetDocVisualization = (aspectId: number) => {
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return PerspectivesQueryOptions.useGetDocVisualization(aspectId, searchQuery, filter as MyFilter<SdocColumns>);
};
