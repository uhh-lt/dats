import {
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Pagination,
  TextField,
  Toolbar,
} from "@mui/material";
import { memo, useCallback, useMemo, useState } from "react";

interface SelectListItem {
  id: number;
  description: string;
}

interface ExporterSelectListProps {
  items: SelectListItem[];
  value: number[];
  onChange: (value: number[]) => void;
  itemsPerPage: number;
  singleSelect: boolean;
}

function ExporterItemSelectList({ items, value, onChange, itemsPerPage, singleSelect }: ExporterSelectListProps) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");

  // computed
  const filteredItems = useMemo(() => {
    const result = items.filter((item) => item.description.startsWith(filter));
    return result;
  }, [items, filter]);

  const emptyItems = useMemo(
    () => (page > 0 ? Math.max(0, page * itemsPerPage - filteredItems.length) : 0),
    [filteredItems, page, itemsPerPage],
  );

  // ui events
  const handleFilterChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(event.target.value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  }, []);

  const handleToggle = useCallback(
    (id: number) => () => {
      if (singleSelect) {
        onChange([id]);
      } else {
        const currentIndex = value.indexOf(id);
        const newValue = [...value];

        if (currentIndex === -1) {
          newValue.push(id);
        } else {
          newValue.splice(currentIndex, 1);
        }

        onChange(newValue);
      }
    },
    [singleSelect, value, onChange],
  );

  const handleToggleAll = useCallback(() => {
    if (value.length === items.length) {
      onChange([]);
    } else {
      onChange(items.map((item) => item.id));
    }
  }, [value.length, items, onChange]);

  const paginatedItems = useMemo(
    () => filteredItems.slice((page - 1) * itemsPerPage, (page - 1) * itemsPerPage + itemsPerPage),
    [filteredItems, page, itemsPerPage],
  );

  return (
    <>
      <Toolbar disableGutters sx={{ px: 2 }}>
        {!singleSelect && (
          <Checkbox
            edge="start"
            tabIndex={-1}
            disableRipple
            sx={{ mr: 2 }}
            indeterminate={value.length > 0 && value.length < items.length}
            checked={value.length === items.length}
            onChange={handleToggleAll}
          />
        )}
        <TextField
          autoFocus
          fullWidth
          value={filter}
          onChange={handleFilterChange}
          label="Filter the items"
          variant="outlined"
        />
      </Toolbar>
      <Divider />
      <List>
        {paginatedItems.map((item) => {
          const labelId = `checkbox-list-label-${item}`;
          return (
            <ListItem key={item.id} disablePadding>
              <ListItemButton role={undefined} onClick={handleToggle(item.id)} dense>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={value.indexOf(item.id) !== -1}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ "aria-labelledby": labelId }}
                  />
                </ListItemIcon>
                <ListItemText id={labelId} primary={item.description} />
              </ListItemButton>
            </ListItem>
          );
        })}
        {emptyItems > 0 && (
          <div
            style={{
              height: 50 * emptyItems,
            }}
          ></div>
        )}
      </List>
      <Pagination
        count={Math.ceil(filteredItems.length / itemsPerPage)}
        page={page}
        onChange={handlePageChange}
        variant="outlined"
        shape="rounded"
      />
    </>
  );
}

export default memo(ExporterItemSelectList);
