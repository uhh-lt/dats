import { MyFilter } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";
import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { perspectiveQueries } from "./perspectiveQueries";

export const useGetDocVisualization = (aspectId: number) => {
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return useQuery({
    ...perspectiveQueries.visualization(aspectId, searchQuery, filter as MyFilter<SdocColumns>),
    placeholderData: (previous) => previous,
  });
};
