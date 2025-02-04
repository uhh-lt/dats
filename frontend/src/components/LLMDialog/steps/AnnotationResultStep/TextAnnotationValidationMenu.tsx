import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Autocomplete,
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
  UseAutocompleteProps,
} from "@mui/material";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { SpanAnnotationReadResolved } from "../../../../api/openapi/models/SpanAnnotationReadResolved.ts";

interface ICodeFilter extends CodeRead {
  title: string;
}

const filter = createFilterOptions<ICodeFilter>();

export interface TextAnnotationValidationMenuProps {
  codesForSelection: CodeRead[];
  onClose?: (reason?: "backdropClick" | "escapeKeyDown") => void;
  onEdit: (annotationToEdit: SpanAnnotationReadResolved, newCode: CodeRead) => void;
  onDelete: (annotationToDelete: SpanAnnotationReadResolved) => void;
}

export interface TextAnnotationValidationMenuHandle {
  open: (position: PopoverPosition, annotations?: SpanAnnotationReadResolved[] | undefined) => void;
}

const TextAnnotationValidationMenu = forwardRef<TextAnnotationValidationMenuHandle, TextAnnotationValidationMenuProps>(
  ({ codesForSelection, onClose, onEdit, onDelete }, ref) => {
    // local client state
    const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [showCodeSelection, setShowCodeSelection] = useState(false);
    const [isAutoCompleteOpen, setIsAutoCompleteOpen] = useState(false);
    const [annotationsToEdit, setAnnotationsToEdit] = useState<SpanAnnotationReadResolved[] | undefined>(undefined);
    const [editingAnnotation, setEditingAnnotation] = useState<SpanAnnotationReadResolved | undefined>(undefined);
    const [autoCompleteValue, setAutoCompleteValue] = useState<ICodeFilter | null>(null);

    // computed
    const codeOptions: ICodeFilter[] = useMemo(() => {
      return codesForSelection.map((c) => {
        return {
          ...c,
          title: c.name,
        };
      });
    }, [codesForSelection]);

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      open: openCodeSelector,
    }));

    // methods
    const openCodeSelector = (
      position: PopoverPosition,
      annotations: SpanAnnotationReadResolved[] | undefined = undefined,
    ) => {
      setEditingAnnotation(undefined);
      setAnnotationsToEdit(annotations);
      setShowCodeSelection(annotations === undefined);
      setIsPopoverOpen(true);
      setPosition(position);
    };

    const closeCodeSelector = (reason?: "backdropClick" | "escapeKeyDown") => {
      setShowCodeSelection(false);
      setIsPopoverOpen(false);
      setIsAutoCompleteOpen(false);
      setAutoCompleteValue(null);
      if (onClose) onClose(reason);
    };

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
    const handleChange: UseAutocompleteProps<ICodeFilter, false, false, false>["onChange"] = (_event, newValue) => {
      if (!editingAnnotation) {
        console.error("editingAnnotation is undefined");
        return;
      }

      if (newValue === null) {
        return;
      }

      onEdit(editingAnnotation!, newValue);
      closeCodeSelector();
    };

    const handleEdit = (annotationToEdit: SpanAnnotationReadResolved, code: CodeRead) => {
      setEditingAnnotation(annotationToEdit);
      setAutoCompleteValue({ ...code, title: code.name });
      setShowCodeSelection(true);
    };

    const handleDelete = (annotation: SpanAnnotationReadResolved) => {
      onDelete(annotation);
      closeCodeSelector();
    };

    return (
      <Popover
        open={isPopoverOpen}
        onClose={(_event, reason) => closeCodeSelector(reason)}
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
                code={annotation.code}
                annotation={annotation}
                handleDelete={handleDelete}
                handleEdit={handleEdit}
              />
            ))}
          </List>
        ) : (
          <>
            <Autocomplete
              value={autoCompleteValue}
              onChange={handleChange}
              filterOptions={(options, params) => {
                return filter(options, params);
              }}
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
                  <Box style={{ width: 20, height: 20, backgroundColor: option.color, marginRight: 8 }}></Box>{" "}
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
              onClose={(_event, reason) => reason === "escape" && closeCodeSelector("escapeKeyDown")}
            />
          </>
        )}
      </Popover>
    );
  },
);

export default TextAnnotationValidationMenu;

interface AnnotationMenuListItemProps {
  code: CodeRead;
  annotation: SpanAnnotationReadResolved;
  handleDelete: (annotationToDelete: SpanAnnotationReadResolved) => void;
  handleEdit: (annotationToEdit: SpanAnnotationReadResolved, newCode: CodeRead) => void;
}

function AnnotationMenuListItem({ code, annotation, handleEdit, handleDelete }: AnnotationMenuListItemProps) {
  return (
    <ListItem>
      <Box style={{ width: 20, height: 20, backgroundColor: code.color, marginRight: 8 }} />
      <ListItemText primary={code.name} />
      <Tooltip title="Delete">
        <IconButton onClick={() => handleDelete(annotation)}>
          <DeleteIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton edge="end" onClick={() => handleEdit(annotation, code)}>
          <EditIcon />
        </IconButton>
      </Tooltip>
    </ListItem>
  );
}
