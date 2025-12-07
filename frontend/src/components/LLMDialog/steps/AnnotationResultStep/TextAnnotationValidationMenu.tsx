import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Autocomplete,
  AutocompleteCloseReason,
  Box,
  createFilterOptions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  PopoverPosition,
  TextField,
  Tooltip,
} from "@mui/material";
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import CodeHooks from "../../../../api/CodeHooks.ts";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { SpanAnnotationRead } from "../../../../api/openapi/models/SpanAnnotationRead.ts";

interface ICodeFilter extends CodeRead {
  title: string;
}

const filter = createFilterOptions<ICodeFilter>();

export interface TextAnnotationValidationMenuProps {
  codesForSelection: CodeRead[];
  onClose?: (reason?: "backdropClick" | "escapeKeyDown") => void;
  onEdit: (annotationToEdit: SpanAnnotationRead, newCode: CodeRead) => void;
  onDelete: (annotationToDelete: SpanAnnotationRead) => void;
}

export interface TextAnnotationValidationMenuHandle {
  open: (position: PopoverPosition, annotations?: SpanAnnotationRead[] | undefined) => void;
}

const TextAnnotationValidationMenu = forwardRef<TextAnnotationValidationMenuHandle, TextAnnotationValidationMenuProps>(
  ({ codesForSelection, onClose, onEdit, onDelete }, ref) => {
    // local client state
    const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [showCodeSelection, setShowCodeSelection] = useState(false);
    const [isAutoCompleteOpen, setIsAutoCompleteOpen] = useState(false);
    const [annotationsToEdit, setAnnotationsToEdit] = useState<SpanAnnotationRead[] | undefined>(undefined);
    const [editingAnnotation, setEditingAnnotation] = useState<SpanAnnotationRead | undefined>(undefined);
    const [autoCompleteValue, setAutoCompleteValue] = useState<ICodeFilter | null>(null);

    // computed
    const codeOptions: ICodeFilter[] = useMemo(() => {
      return codesForSelection.map((c) => ({
        ...c,
        title: c.name,
      }));
    }, [codesForSelection]);

    // methods
    const openCodeSelector = useCallback(
      (position: PopoverPosition, annotations: SpanAnnotationRead[] | undefined = undefined) => {
        setEditingAnnotation(undefined);
        setAnnotationsToEdit(annotations);
        setShowCodeSelection(annotations === undefined);
        setIsPopoverOpen(true);
        setPosition(position);
      },
      [],
    );

    const closeCodeSelector = useCallback(
      (reason?: "backdropClick" | "escapeKeyDown") => {
        setShowCodeSelection(false);
        setIsPopoverOpen(false);
        setIsAutoCompleteOpen(false);
        setAutoCompleteValue(null);
        if (onClose) onClose(reason);
      },
      [onClose],
    );

    // exposed methods (via ref)
    useImperativeHandle(
      ref,
      () => ({
        open: openCodeSelector,
      }),
      [openCodeSelector],
    );

    // effects
    // automatically open the autocomplete soon after the code selection is shown
    useEffect(() => {
      if (showCodeSelection) {
        setTimeout(() => {
          setIsAutoCompleteOpen(showCodeSelection);
        }, 250);
      }
    }, [showCodeSelection]);

    // event handlers
    const handleChange = useCallback(
      (_: React.SyntheticEvent, newValue: ICodeFilter | null) => {
        if (!editingAnnotation) {
          console.error("editingAnnotation is undefined");
          return;
        }
        if (newValue === null) {
          return;
        }
        onEdit(editingAnnotation, newValue);
        closeCodeSelector();
      },
      [editingAnnotation, onEdit, closeCodeSelector],
    );

    const handleEditAnnotation = useCallback((annotationToEdit: SpanAnnotationRead, code: CodeRead) => {
      setEditingAnnotation(annotationToEdit);
      setAutoCompleteValue({ ...code, title: code.name });
      setShowCodeSelection(true);
    }, []);

    const handleDeleteAnnotation = useCallback(
      (annotation: SpanAnnotationRead) => {
        onDelete(annotation);
        closeCodeSelector();
      },
      [onDelete, closeCodeSelector],
    );

    const handlePopoverClose = useCallback(
      (_event: unknown, reason: "backdropClick" | "escapeKeyDown") => {
        if (closeCodeSelector) {
          closeCodeSelector(reason);
        }
      },
      [closeCodeSelector],
    );

    const handleAutoCompleteClose = useCallback(
      (_: React.SyntheticEvent, reason: AutocompleteCloseReason) => {
        if (reason === "escape") {
          closeCodeSelector("escapeKeyDown");
        }
      },
      [closeCodeSelector],
    );

    return (
      <Popover
        open={isPopoverOpen}
        onClose={handlePopoverClose}
        anchorPosition={position}
        anchorReference="anchorPosition"
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        {!showCodeSelection && annotationsToEdit ? (
          <List dense>
            {annotationsToEdit.map((annotation) => (
              <AnnotationMenuListItem
                key={annotation.id}
                annotation={annotation}
                handleDelete={handleDeleteAnnotation}
                handleEdit={handleEditAnnotation}
              />
            ))}
          </List>
        ) : (
          <Autocomplete
            value={autoCompleteValue}
            onChange={handleChange}
            filterOptions={(options, params) => filter(options, params)}
            options={codeOptions}
            getOptionLabel={(option) => {
              // Value selected with enter, right from the input
              if (typeof option === "string") {
                return option;
              }
              return option.name;
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box style={{ width: 20, height: 20, backgroundColor: option.color, marginRight: 8 }}></Box>
                {option.title}
              </li>
            )}
            sx={{ width: 300 }}
            renderInput={(params) => <TextField autoFocus {...params} />}
            autoHighlight
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            open={isAutoCompleteOpen}
            onClose={handleAutoCompleteClose}
          />
        )}
      </Popover>
    );
  },
);

interface AnnotationMenuListItemProps {
  annotation: SpanAnnotationRead;
  handleDelete: (annotationToDelete: SpanAnnotationRead) => void;
  handleEdit: (annotationToEdit: SpanAnnotationRead, newCode: CodeRead) => void;
}

function AnnotationMenuListItem({ annotation, handleEdit, handleDelete }: AnnotationMenuListItemProps) {
  const code = CodeHooks.useGetCode(annotation.code_id);

  const handleEditClick = useCallback(() => {
    if (code.data) {
      handleEdit(annotation, code.data);
    }
  }, [annotation, code.data, handleEdit]);

  const handleDeleteClick = useCallback(() => {
    handleDelete(annotation);
  }, [annotation, handleDelete]);

  if (code.data) {
    return (
      <ListItem>
        <Box style={{ width: 20, height: 20, backgroundColor: code.data.color, marginRight: 8 }} />
        <ListItemText primary={code.data.name} />
        <Tooltip title="Delete">
          <IconButton onClick={handleDeleteClick}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton edge="end" onClick={handleEditClick}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      </ListItem>
    );
  }
  return null;
}

export default memo(TextAnnotationValidationMenu);
