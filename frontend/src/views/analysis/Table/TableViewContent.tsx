import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SaveIcon from "@mui/icons-material/Save";

import {
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  tabsClasses,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import TableHooks, { TableRead } from "../../../api/TableHooks.ts";

// register Handsontable's modules
import type { HotTableClass } from "@handsontable//react/hotTableClass.d.ts";
import { HotTable } from "@handsontable/react";
import Handsontable from "handsontable/base";
import "handsontable/dist/handsontable.full.min.css";
import { registerAllModules } from "handsontable/registry";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import CustomHTMLCellRenderer from "./Renderer/CustomHTMLCellRenderer.tsx";
import AddAnnotationDialog from "./Toolbar/AddAnnotationDialog.tsx";
import AddCodeDialog from "./Toolbar/AddCodeDialog.tsx";
import AddDocumentDialog from "./Toolbar/AddDocumentDialog.tsx";
import PageNavigationButton from "./Toolbar/PageNavigationButton.tsx";
import { TableType2Template } from "./templates.ts";

registerAllModules();

// table actions
const isCellSelected = (hot: Handsontable | null | undefined) => {
  if (!hot) return false;

  const selectedCells = hot.getSelected();
  const selectedCell = selectedCells ? selectedCells[0] : undefined;
  const x = selectedCell ? selectedCell[0] : undefined;
  const y = selectedCell ? selectedCell[1] : undefined;

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
  const selectedCell = hot.getSelected()![0]!;
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
  const newLine = cell.data.length > 0 ? "\n" : "";
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
  const hotRef = useRef<HotTableClass>(null);
  const [tablePages, setTablePages] = useState(table.content); // page data
  const [hasChanged, setHasChanged] = useState(false);

  // table pages tabs
  const [currentPageId, setCurrentPageId] = useState<string>(table.content[0].id); // pages tab
  const handlePageChange = (_event: React.SyntheticEvent, newValue: string) => {
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

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // context menu
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const isOpen = Boolean(anchorEl);
  const handleTabMenuClick = (page: string) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
    setSelectedPageId(page);
    setCurrentPageId(page);
  };

  // block navigation if we have changes
  const [oldData, setOldData] = useState(JSON.stringify(table.content));
  useEffect(() => {
    setOldData(JSON.stringify(table.content));
  }, [table.content]);
  useBlocker(() => {
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
        onSuccess(data) {
          openSnackbar({
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

    setAnchorEl(null);
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

    setAnchorEl(null);
    setTablePages(newPages);
    setSelectedPageId("");
  };

  // page actions: rename action
  const handleClickRename = () => {
    if (selectedPageId === "") return;

    setAnchorEl(null);
    setRenamingPageId(selectedPageId);
  };
  useEffect(() => {
    document.getElementById("rename-tab-" + renamingPageId + "-input")?.focus();
    hotRef.current?.hotInstance?.deselectCell();
  }, [renamingPageId]);
  const handleRename = () => {
    if (renamingPageId === "") return;

    const newName = (document.getElementById("rename-tab-" + renamingPageId + "-input") as HTMLInputElement).value;

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
  const onAddSpanAnnotations = (spanAnnotationIds: number[], addRows: boolean) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const cellInfo = getSelectedCellInfo(hot);
    const dataToAdd = spanAnnotationIds.map((spanAnnotationId) => `<annotation id="${spanAnnotationId}" />`);
    addData(hot, cellInfo, dataToAdd, addRows);
  };

  // table actions: add documents
  const onAddDocuments = (sdocIds: number[], addRows: boolean) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const cellInfo = getSelectedCellInfo(hot);
    const dataToAdd = sdocIds.map((sdocId) => `<sdoc id="${sdocId}" />`);
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
                  label={
                    <Stack direction="row" alignItems="center" gap={1}>
                      {pageData.name}
                      <IconButton size="small" onClick={handleTabMenuClick(pageData.id)}>
                        <MoreVertIcon />
                      </IconButton>
                    </Stack>
                  }
                  value={pageData.id}
                  style={{
                    padding: "6px 0px 6px 12px",
                  }}
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
        <Menu anchorEl={anchorEl} open={isOpen} onClose={() => setAnchorEl(null)}>
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
        </Menu>
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
            shouldOpen={() => isCellSelected(hotRef.current?.hotInstance)}
            onConfirmSelection={onAddSpanAnnotations}
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
            afterChange={(_changes, source) => {
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
