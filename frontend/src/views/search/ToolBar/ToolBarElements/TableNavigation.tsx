import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../searchSlice.ts";
import TablePaginationActions from "./TablePaginationActions.tsx";

interface TableNavigationProps {
  numDocuments: number;
}

function TableNavigation({ numDocuments }: TableNavigationProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const { pageIndex, pageSize } = useAppSelector((state) => state.search.paginationModel);

  // ui event handlers
  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement, MouseEvent>, newPage: number) => {
    dispatch(SearchActions.setPage(newPage));
  };

  const text = `${pageIndex * pageSize + 1}-${Math.min((pageIndex + 1) * pageSize, numDocuments)} of ${numDocuments}`;

  return (
    <>
      {text}
      <TablePaginationActions
        count={numDocuments}
        page={pageIndex}
        rowsPerPage={pageSize}
        onPageChange={handleChangePage}
      />
    </>
  );
}

export default TableNavigation;
