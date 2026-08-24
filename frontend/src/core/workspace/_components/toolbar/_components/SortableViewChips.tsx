import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToFirstScrollableAncestor, restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
} from "@mui/material";
import { FormEvent, useCallback, useState } from "react";
import { WorkspaceView } from "../../../types/WorkspaceGeneratedTypes";

interface SortableViewChipProps {
  view: WorkspaceView<string>;
  isActive: boolean;
  existingNames: string[];
  isRenaming: boolean;
  onSelect: (viewId: number) => void;
  onRename: (name: string, onSuccess: () => void) => void;
  onDelete: () => void;
}

function SortableViewChip({
  view,
  isActive,
  existingNames,
  isRenaming,
  onSelect,
  onRename,
  onDelete,
}: SortableViewChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: view.id });
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const normalizedRenameValue = renameValue.trim();
  const renameError =
    normalizedRenameValue.length === 0
      ? "View name is required."
      : existingNames.some((name) => name.toLocaleLowerCase() === normalizedRenameValue.toLocaleLowerCase())
        ? "A view with this name already exists."
        : undefined;

  const handleOpenRenameDialog = () => {
    setRenameDialogOpen(true);
    setMenuAnchor(null);
  };
  const handleCloseRenameDialog = () => {
    setRenameDialogOpen(false);
  };
  const handleDelete = () => {
    setMenuAnchor(null);
    onDelete();
  };
  const handleRenameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (renameError) return;
    onRename(normalizedRenameValue, handleCloseRenameDialog);
  };

  return (
    <>
      <Chip
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        size="small"
        label={view.name}
        color={isActive ? "primary" : "default"}
        variant={isActive ? "filled" : "outlined"}
        onClick={(event) => (isActive ? setMenuAnchor(event.currentTarget) : onSelect(view.id))}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        sx={{
          flexShrink: 0,
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
          // Keep the dragged chip in the layout but invisible; the DragOverlay is the visual.
          opacity: isDragging ? 0 : 1,
        }}
      />
      {isActive ? (
        <>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={handleOpenRenameDialog}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Rename</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDelete}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
          <Dialog
            open={renameDialogOpen}
            onClose={handleCloseRenameDialog}
            maxWidth="xs"
            fullWidth
            TransitionProps={{ onEnter: () => setRenameValue(view.name) }}
          >
            <Box component="form" onSubmit={handleRenameSubmit}>
              <DialogTitle>Rename view</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  fullWidth
                  margin="dense"
                  label="View name"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  error={Boolean(renameError)}
                  helperText={renameError}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseRenameDialog}>Cancel</Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={Boolean(renameError) || normalizedRenameValue === view.name || isRenaming}
                >
                  Rename
                </Button>
              </DialogActions>
            </Box>
          </Dialog>
        </>
      ) : null}
    </>
  );
}

interface SortableViewChipsProps {
  views: WorkspaceView<string>[];
  activeViewId?: number;
  isRenaming: boolean;
  onSelect: (viewId: number) => void;
  onRename: (name: string, onSuccess: () => void) => void;
  onDelete: () => void;
  onReorder: (viewIds: number[]) => void;
}

export function SortableViewChips({
  views,
  activeViewId,
  isRenaming,
  onSelect,
  onRename,
  onDelete,
  onReorder,
}: SortableViewChipsProps) {
  const [activeDragViewId, setActiveDragViewId] = useState<number>();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Transient id-order override, set synchronously on drop (same render batch as
  // clearing the drag id) so the list is correct the moment the chip becomes visible.
  // The Query cache notifies one render later, so without this the chip would flash
  // at its old position. View data always comes from the `views` prop (single source
  // of truth); the override is cleared once the server order catches up.
  const [orderOverride, setOrderOverride] = useState<number[]>();
  const serverOrder = views.map((view) => view.id);
  if (orderOverride && orderOverride.every((id, index) => serverOrder[index] === id)) {
    setOrderOverride(undefined); // server order caught up, drop the override
  }

  const viewById = new Map(views.map((view) => [view.id, view]));
  const orderedViews = orderOverride
    ? orderOverride.flatMap((id) => {
        const view = viewById.get(id);
        return view ? [view] : [];
      })
    : views;

  const activeDragView = orderedViews.find((currentView) => currentView.id === activeDragViewId);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (typeof event.active.id === "number") {
      setActiveDragViewId(event.active.id);
    }
  }, []);
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragViewId(undefined);
      const activeId = event.active.id;
      const overId = event.over?.id;
      if (typeof activeId !== "number" || typeof overId !== "number") return;
      const sourceIndex = orderedViews.findIndex((currentView) => currentView.id === activeId);
      const destinationIndex = orderedViews.findIndex((currentView) => currentView.id === overId);
      if (sourceIndex < 0 || destinationIndex < 0 || sourceIndex === destinationIndex) return;
      const reorderedIds = arrayMove(orderedViews, sourceIndex, destinationIndex).map((currentView) => currentView.id);
      setOrderOverride(reorderedIds); // synchronous, same batch as clearing the drag id
      onReorder(reorderedIds);
    },
    [onReorder, orderedViews],
  );
  const handleDragCancel = useCallback(() => {
    setActiveDragViewId(undefined);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis, restrictToFirstScrollableAncestor]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={orderedViews.map((currentView) => currentView.id)}
        strategy={horizontalListSortingStrategy}
      >
        {orderedViews.map((currentView) => (
          <SortableViewChip
            key={currentView.id}
            view={currentView}
            isActive={currentView.id === activeViewId}
            existingNames={orderedViews
              .filter((otherView) => otherView.id !== currentView.id)
              .map((otherView) => otherView.name)}
            isRenaming={isRenaming}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </SortableContext>
      <DragOverlayContent view={activeDragView} isActive={activeDragView?.id === activeViewId} />
    </DndContext>
  );
}

function DragOverlayContent({ view, isActive }: { view?: WorkspaceView<string>; isActive: boolean }) {
  return (
    <DragOverlay>
      {view ? (
        <Chip
          size="small"
          label={view.name}
          color={isActive ? "primary" : "default"}
          variant={isActive ? "filled" : "outlined"}
        />
      ) : null}
    </DragOverlay>
  );
}
