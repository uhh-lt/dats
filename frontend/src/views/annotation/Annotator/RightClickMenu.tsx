import React, { MouseEvent } from "react";
import Popper, { PopperProps } from "@mui/material/Popper";
import Paper from "@mui/material/Paper";
import { Box, ClickAwayListener, IconButton, List, ListItem, ListItemText, Tooltip } from "@mui/material";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { store } from "../../../store/store";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { Combobox } from "./Combobox";
import { ICode } from "./ICode";
import { ISpanAnnotation } from "./ISpanAnnotation";
import MemoButton from "../../../features/memo-dialog/MemoButton";

export default function RightClickMenu(props: {
  onAdd: any;
  onModify: any;
  onDelete: any;
  invalidSelection: any;
  children: any;
  onSetGroups: any;
}) {
  // local state
  const [open, setOpen] = React.useState(false);
  const [right, setRight] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<PopperProps["anchorEl"]>(null);
  const [selectedSpanAnnotations, setSelectedSpanAnnotations] = React.useState<ISpanAnnotation[]>([]);
  const [editSpan, setEditSpan] = React.useState<ISpanAnnotation | null>(null);

  // global state (react redux)
  const spanGroups: readonly number[] = useAppSelector((state) => state.annotations.spanGroups);

  // computed
  const id = open ? "right-click-menu" : undefined;

  // ui handlers
  const handleClose = () => {
    setOpen(false);
    setAnchorEl(null);
    setEditSpan(null);
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (event.button === 2) return;
    const selection = window.getSelection();

    // Resets when the selection has a length of 0
    if (!selection || selection.rangeCount <= 0 || props.invalidSelection()) {
      handleClose();
      return;
    }

    // const rect = new DOMRect(event.pageX, event.pageY);
    const rect = selection.focusNode!.parentElement;
    //const getBoundingClientRect = () => rect;
    // const getBoundingClientRect = () => selection.getRangeAt(0).getBoundingClientRect();

    setSelectedSpanAnnotations([]);
    setRight(false);
    setAnchorEl(rect);
    setOpen(true);
    props.onAdd();
  };

  const onAdd = (code: ICode) => {
    handleClose();
    props.onModify(code, selectedSpanAnnotations.length ? selectedSpanAnnotations[0] : undefined);
  };

  const onDelete = (span: ISpanAnnotation) => {
    handleClose();
    props.onDelete(span);
    setSelectedSpanAnnotations([]);
  };

  const onEdit = (span: ISpanAnnotation) => {
    setRight(false);
    setSelectedSpanAnnotations([span]);
  };

  const onAddGroup = (span: ISpanAnnotation) => () => {
    console.log("add group for span", span);
    setSelectedSpanAnnotations((prevState: ISpanAnnotation[]) => {
      const newState = prevState.slice();
      const idx = newState.findIndex((s) => s.i === span.i);
      const s = newState[idx];
      if (s.hasOwnProperty("groups")) s.groups!.push(1);
      else {
        newState[idx] = { ...s, groups: [1] };
      }
      return newState;
    });
  };

  const onDeleteGroup = (groupToDelete: number) => () => {};

  const onSetGroups = (span: ISpanAnnotation, groups: number[]) => {
    setSelectedSpanAnnotations((prevState: ISpanAnnotation[]) => {
      const newState = prevState.slice();
      const idx = newState.findIndex((s) => s.i === span.i);
      const s = newState[idx];
      if (s.hasOwnProperty("groups")) s.groups = groups;
      else {
        newState[idx] = { ...s, groups };
      }
      return newState;
    });
  };

  const onViewGroup = (span: ISpanAnnotation) => () => {
    setEditSpan(span);
  };

  const onContextMenu = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.className === "tok" && target.childElementCount > 0) {
      event.preventDefault();
      const state = store.getState();
      const tokenIndex = parseInt(target.getAttribute("t-i")!);
      const annos = state.annotations.annotations.filter((s) => s.begin <= tokenIndex && s.end > tokenIndex);
      setSelectedSpanAnnotations(annos);

      setRight(true);
      setAnchorEl(target);
      setOpen(true);
      console.log(annos);
    }
  };

  return (
    <div>
      <div aria-describedby={id} onMouseUp={handleMouseUp} onContextMenu={onContextMenu}>
        {props.children}
      </div>

      <Popper
        id={id}
        open={open}
        anchorEl={anchorEl}
        // transition
        placement="bottom-start"
      >
        <ClickAwayListener onClickAway={handleClose} mouseEvent="onMouseDown">
          <Paper elevation={3} /*sx={{bgcolor: 'primary.main', color: 'white'}}*/ onClick={() => true}>
            {right ? (
              <List dense={true}>
                {selectedSpanAnnotations.map((spanAnnotation) => (
                  <ListItem key={spanAnnotation.i}>
                    <Box
                      style={{ width: 20, height: 20, backgroundColor: spanAnnotation.code?.color, marginRight: 8 }}
                    ></Box>
                    <ListItemText primary={spanAnnotation.code?.name} />
                    <MemoButton spanAnnotationId={spanAnnotation.id} />
                    <Tooltip title="Delete" enterDelay={500}>
                      <IconButton edge="end" aria-label="delete" onClick={() => onDelete(spanAnnotation)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit" enterDelay={500}>
                      <IconButton
                        edge={spanAnnotation.groups?.length || spanAnnotation === editSpan ? false : "end"}
                        aria-label="edit"
                        onClick={() => onEdit(spanAnnotation)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {/*// todo: fix this: spanGroups: Type 'readonly number[]' is not assignable to type 'readonly number[][]'.*/}
                    {/*{spanAnnotation.groups?.length || spanAnnotation === editSpan ? (*/}
                    {/*  <Autocomplete*/}
                    {/*    multiple*/}
                    {/*    limitTags={1}*/}
                    {/*    forcePopupIcon={false}*/}
                    {/*    id="multiple-limit-tags"*/}
                    {/*    options={spanGroups}*/}
                    {/*    open={spanAnnotation === editSpan ? true : undefined}*/}
                    {/*    openOnFocus*/}
                    {/*    defaultValue={spanAnnotation.groups}*/}
                    {/*    disableClearable*/}
                    {/*    getOptionLabel={(n) => n.toString()}*/}
                    {/*    renderInput={(params) => <TextField {...params} variant="standard" placeholder="Groups" />}*/}
                    {/*    onChange={(event, newValue) => {*/}
                    {/*      props.onSetGroups(spanAnnotation, newValue);*/}
                    {/*    }}*/}
                    {/*    sx={{ width: 150 }}*/}
                    {/*  />*/}
                    {/*) : (*/}
                    {/*  <Tooltip title="Group" enterDelay={500}>*/}
                    {/*    <IconButton edge="end" aria-label="group" onClick={onViewGroup(spanAnnotation)}>*/}
                    {/*      <AddCircleIcon></AddCircleIcon>*/}
                    {/*    </IconButton>*/}
                    {/*  </Tooltip>*/}
                    {/*)}*/}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Combobox onAdd={onAdd} onDelete={onDelete}></Combobox>
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </div>
  );
}
