import HotTable from "@handsontable/react";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import SaveIcon from "@mui/icons-material/Save";
import {
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  tabsClasses,
} from "@mui/material";
import Handsontable from "handsontable";
import "handsontable/dist/handsontable.full.min.css";
import { registerAllModules } from "handsontable/registry";
import { useEffect, useMemo, useRef, useState } from "react";
import { unstable_useBlocker } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import TableHooks, { TableRead } from "../../../api/TableHooks";
import { AnnotationOccurrence, CodeRead, SourceDocumentRead } from "../../../api/openapi";
import GenericAnchorMenu, { GenericAnchorContextMenuHandle } from "../../../components/GenericAnchorMenu";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import CustomHTMLCellRenderer from "./Renderer/CustomHTMLCellRenderer";
import AddAnnotationDialog from "./Toolbar/AddAnnotationDialog";
import AddCodeDialog from "./Toolbar/AddCodeDialog";
import AddDocumentDialog from "./Toolbar/AddDocumentDialog";
import PageNavigationButton from "./Toolbar/PageNavigationButton";
import { TableType2Template } from "./templates";

// register Handsontable's modules
registerAllModules();

// table actions
const isCellSelected = (hot: Handsontable | null | undefined) => {
  if (!hot) return false;

  let selectedCells = hot.getSelected();
  let selectedCell = selectedCells ? selectedCells[0] : undefined;
  let x = selectedCell ? selectedCell[0] : undefined;
  let y = selectedCell ? selectedCell[1] : undefined;

  const shouldOpen = x !== undefined && y !== undefined && x !== -1 && y !== -1;
  if (!shouldOpen) {
    alert("Please select a cell.");
  }
  return shouldOpen;
};

type CellInfo = {
  x: number;
  y: number;
  data: string;
};

const getSelectedCellInfo = (hot: Handsontable): CellInfo => {
  let selectedCell = hot.getSelected()![0]!;
  return {
    x: selectedCell[1],
    y: selectedCell[0],
    data: hot.getDataAtCell(selectedCell[0], selectedCell[1]),
  };
};

const addData = (hot: Handsontable, cell: CellInfo, dataToAdd: string[], addAsRows: boolean) => {
  if (addAsRows) {
    addDataBelowCellAsRows(hot, cell, dataToAdd);
  } else {
    addDataToCell(hot, cell, dataToAdd);
  }
};

const addDataToCell = (hot: Handsontable, cell: CellInfo, dataToAdd: string[]) => {
  let newLine = cell.data.length > 0 ? "\n" : "";
  hot.setDataAtCell(cell.y, cell.x, cell.data + newLine + dataToAdd.join("\n"));
};

const addDataBelowCellAsRows = (hot: Handsontable, cell: CellInfo, dataToAdd: string[]) => {
  hot.alter("insert_row_below", cell.y, dataToAdd.length);
  dataToAdd.forEach((dta, i) => {
    hot.setDataAtCell(cell.y + 1 + i, cell.x, dta);
  });
};

interface TableViewContentProps {
  table: TableRead;
}

function TableViewContent({ table }: TableViewContentProps) {
  // local client state
  const hotRef = useRef<HotTable>(null);
  const tabContextMenuRef = useRef<GenericAnchorContextMenuHandle>(null);
  const [tablePages, setTablePages] = useState(table.content); // page data
  const [hasChanged, setHasChanged] = useState(false);

  // table pages tabs
  const [currentPageId, setCurrentPageId] = useState<string>(table.content[0].id); // pages tab
  const handlePageChange = (event: React.SyntheticEvent, newValue: string) => {
    setCurrentPageId(newValue);
  };

  const currentPage = useMemo(() => {
    return tablePages.find((p) => p.id === currentPageId);
  }, [currentPageId, tablePages]);

  // toolbar
  const [selectedPageId, setSelectedPageId] = useState(""); // the page that was right clicked to open the context menu
  const [renamingPageId, setRenamingPageId] = useState(""); // the page that is being renamed

  // global server state
  const updateTable = TableHooks.useUpdateTable();

  // context menu
  const handleOpenContextMenu = (page: string) => (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    tabContextMenuRef.current?.open(event.currentTarget);
    setSelectedPageId(page);
    setCurrentPageId(page);
  };

  // block navigation if we have changes
  const [oldData, setOldData] = useState(JSON.stringify(table.content));
  useEffect(() => {
    setOldData(JSON.stringify(table.content));
  }, [table.content]);
  unstable_useBlocker(() => {
    if (oldData !== JSON.stringify(tablePages)) {
      return !window.confirm("You have unsaved changes! Are you sure you want to leave?");
    }
    return false;
  });

  const handleSaveTable = () => {
    updateTable.mutate(
      {
        analysisTableId: table.id,
        requestBody: {
          table_type: table.table_type,
          title: table.title,
          content: JSON.stringify(tablePages),
        },
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Saved table '${data.title}'`,
            severity: "success",
          });
          setHasChanged(false);
        },
      },
    );
  };

  // page actions: add action
  const handleAddPage = () => {
    const id = uuidv4();
    setTablePages((pages) => [
      ...pages,
      { id: id, name: `Table sheet ${pages.length + 1}`, content: TableType2Template[table.table_type] },
    ]);
    setCurrentPageId(id);
  };

  // page actions: delete action
  const handleClickDelete = () => {
    if (tablePages.length <= 1 || selectedPageId === "") return; // you cannot delete the last page

    const newPages = [...tablePages];
    const deleteIndex = newPages.findIndex((p) => p.id === selectedPageId);
    newPages.splice(deleteIndex, 1);

    tabContextMenuRef.current?.close();
    setTablePages(newPages);
    setCurrentPageId(newPages[0].id);
    setSelectedPageId("");
  };

  // page actions: copy action
  const handleClickCopy = () => {
    if (selectedPageId === "") return;

    const newPages = [...tablePages];
    const copyIndex = newPages.findIndex((p) => p.id === selectedPageId);
    newPages.splice(copyIndex + 1, 0, {
      id: uuidv4(),
      name: tablePages[copyIndex].name + " (copy)",
      content: tablePages[copyIndex].content,
    });

    tabContextMenuRef.current?.close();
    setTablePages(newPages);
    setSelectedPageId("");
  };

  // page actions: rename action
  const handleClickRename = () => {
    if (selectedPageId === "") return;

    tabContextMenuRef.current?.close();
    setRenamingPageId(selectedPageId);
  };
  useEffect(() => {
    document.getElementById("rename-tab-" + renamingPageId + "-input")?.focus();
    hotRef.current?.hotInstance?.deselectCell();
  }, [renamingPageId]);
  const handleRename = () => {
    if (renamingPageId === "") return;

    let newName = (document.getElementById("rename-tab-" + renamingPageId + "-input") as HTMLInputElement).value;

    const newPages = [...tablePages];
    const renameIndex = newPages.findIndex((p) => p.id === renamingPageId);
    newPages[renameIndex].name = newName;

    setTablePages(newPages);
    setRenamingPageId("");
    setSelectedPageId("");
  };

  // table actions: add codes
  const onAddCodes = (codes: CodeRead[], addRows: boolean) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const cellInfo = getSelectedCellInfo(hot);
    const dataToAdd = codes.map((code) => `<code id="${code.id}">${code.name}</code>`);
    addData(hot, cellInfo, dataToAdd, addRows);
  };

  // table actions: add annotations
  const onAddAnnotations = (annotations: AnnotationOccurrence[], addRows: boolean) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const cellInfo = getSelectedCellInfo(hot);
    const dataToAdd = annotations.map(
      (a) => `<annotation sdocId="${a.sdoc.id}" codeId="${a.code.id}">${a.text}</annotation>`,
    );
    addData(hot, cellInfo, dataToAdd, addRows);
  };

  // table actions: add documents
  const onAddDocuments = (sdocs: SourceDocumentRead[], addRows: boolean) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const cellInfo = getSelectedCellInfo(hot);
    const dataToAdd = sdocs.map((sdoc) => `<sdoc id="${sdoc.id}">${sdoc.filename}</sdoc>`);
    addData(hot, cellInfo, dataToAdd, addRows);
  };

  return (
    <Box className="myFlexContainer h100">
      <Toolbar disableGutters variant="dense" sx={{ bgcolor: "#f0f0f0" }}>
        <Tooltip title="Add new page">
          <IconButton onClick={handleAddPage}>
            <AddIcon />
          </IconButton>
        </Tooltip>
        <PageNavigationButton tablePages={tablePages} currentPageId={currentPageId} onPageIdChange={setCurrentPageId} />
        <Tabs
          value={currentPageId}
          onChange={handlePageChange}
          variant="scrollable"
          scrollButtons
          sx={{
            [`& .${tabsClasses.scrollButtons}`]: {
              "&.Mui-disabled": { opacity: 0.3 },
            },
          }}
        >
          {tablePages.map((pageData) => {
            if (pageData.id !== renamingPageId) {
              return (
                <Tab
                  key={pageData.id}
                  label={pageData.name}
                  value={pageData.id}
                  onContextMenu={handleOpenContextMenu(pageData.id)}
                />
              );
            } else {
              return (
                <Tab
                  key={pageData.id}
                  value={pageData.id}
                  disableRipple
                  disableFocusRipple
                  disableTouchRipple
                  style={{ padding: "6px" }}
                  label={
                    <TextField
                      variant="outlined"
                      defaultValue={pageData.name}
                      onBlur={() => handleRename()}
                      onKeyDown={(event) => (event.key === "Enter" || event.key === "Escape") && handleRename()}
                      inputProps={{
                        id: `rename-tab-${pageData.id}-input`,
                        style: {
                          padding: "6px",
                        },
                      }}
                    />
                  }
                />
              );
            }
          })}
        </Tabs>
        <GenericAnchorMenu ref={tabContextMenuRef}>
          <MenuItem onClick={() => handleClickDelete()} disabled={tablePages.length === 1}>
            <ListItemIcon>
              <DeleteIcon />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleClickRename()}>
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleClickCopy()}>
            <ListItemIcon>
              <ContentCopyIcon />
            </ListItemIcon>
            <ListItemText>Duplicate</ListItemText>
          </MenuItem>
        </GenericAnchorMenu>
        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={1} mr={2} flexShrink={0}>
          <AddCodeDialog
            projectId={table.project_id}
            shouldOpen={() => isCellSelected(hotRef.current?.hotInstance)}
            onConfirmSelection={onAddCodes}
            buttonProps={{ variant: "outlined" }}
          />
          <AddAnnotationDialog
            projectId={table.project_id}
            userIds={[table.user_id]}
            shouldOpen={() => isCellSelected(hotRef.current?.hotInstance)}
            onConfirmSelection={onAddAnnotations}
            buttonProps={{ variant: "outlined" }}
          />
          <AddDocumentDialog
            projectId={table.project_id}
            shouldOpen={() => isCellSelected(hotRef.current?.hotInstance)}
            onConfirmSelection={onAddDocuments}
            buttonProps={{ variant: "outlined" }}
          />
          <Button variant="outlined" onClick={handleSaveTable} startIcon={<SaveIcon />}>
            Save table
          </Button>
        </Stack>
      </Toolbar>
      <Box className="myFlexFillAllContainer custom-table">
        {currentPage && (
          <HotTable
            ref={hotRef}
            data={currentPage.content}
            key={currentPage.id}
            id={currentPage.id}
            persistentState={true}
            manualColumnResize={true}
            colHeaders={true}
            contextMenu={true}
            dropdownMenu={true}
            multiColumnSorting={true}
            filters={true}
            manualRowMove={true}
            manualColumnMove={true}
            autoRowSize={false}
            autoColumnSize={false}
            height="100%"
            style={{ overflowX: "scroll" }}
            outsideClickDeselects={false}
            licenseKey="non-commercial-and-evaluation" // for non-commercial use only
            afterChange={(changes, source) => {
              if (!hasChanged && source === "edit") {
                setHasChanged(true);
              }
            }}
          >
            <CustomHTMLCellRenderer hot-renderer />
          </HotTable>
        )}
      </Box>
    </Box>
  );
}

export default TableViewContent;
