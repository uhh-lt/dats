import AddIcon from "@mui/icons-material/Add";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import RemoveIcon from "@mui/icons-material/Remove";
import { List, ListItem, ListItemButton, ListItemText, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { KeyboardEvent, useState } from "react";
import { AnnoscalingResult } from "../../../api/openapi/models/AnnoscalingResult.ts";

interface AnnotationScalingListContentProps {
  data: AnnoscalingResult[];
  submit: () => void;
  accept: AnnoscalingResult[];
  reject: AnnoscalingResult[];
  setAccept: React.Dispatch<React.SetStateAction<AnnoscalingResult[]>>;
  setReject: React.Dispatch<React.SetStateAction<AnnoscalingResult[]>>;
}

export function AnnotationScalingList({
  data,
  submit,
  accept,
  reject,
  setAccept,
  setReject,
}: AnnotationScalingListContentProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const suggestions = [null, ...data];

  const toggle = (value: AnnoscalingResult | null, good: boolean | null) => {
    if (value === null) {
      // toggle all list entries
      if (good === true) {
        setAccept(data);
        setReject([]);
      } else if (good === false) {
        setAccept([]);
        setReject(data);
      } else {
        setAccept([]);
        setReject([]);
      }
      return;
    }
    const currentAcceptIndex = accept.indexOf(value);
    const currentRejectIndex = reject.indexOf(value);
    const newAccept = [...accept];
    const newReject = [...reject];

    if (currentAcceptIndex === -1 && good === true) {
      newAccept.push(value);
    } else if (currentAcceptIndex !== -1 && good !== true) {
      newAccept.splice(currentAcceptIndex, 1);
    }

    if (currentRejectIndex === -1 && good === false) {
      newReject.push(value);
    } else if (currentRejectIndex !== -1 && good !== false) {
      newReject.splice(currentRejectIndex, 1);
    }

    setAccept(newAccept);
    setReject(newReject);
  };

  const handleToggle = (value: AnnoscalingResult | null, good: boolean | null) => () => toggle(value, good);

  const handleKeyNav = (event: KeyboardEvent) => {
    if (event.code === "ArrowDown" && selectedIndex + 1 < suggestions.length) {
      setSelectedIndex(selectedIndex + 1);
    } else if (event.code === "ArrowUp" && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (event.code === "ArrowLeft") {
      const val = suggestions[selectedIndex];
      toggle(val, true);
    } else if (event.code === "ArrowRight") {
      const val = suggestions[selectedIndex];
      toggle(val, false);
    } else if (event.code === "Escape") {
      const val = suggestions[selectedIndex];
      toggle(val, null);
    } else if (event.code === "Enter") {
      submit();
    } else {
      return;
    }
    event.preventDefault();
  };

  return (
    <List sx={{ width: "100%" }} onKeyDown={handleKeyNav} dense disablePadding>
      {suggestions.map((value, i) => {
        return (
          <ListItem key={value ? `${value.sdoc_id}-${value.sentence_id}` : "all"} disablePadding divider={i === 0}>
            <ListItemButton
              disableRipple
              autoFocus={i === 0}
              role={undefined}
              dense
              selected={selectedIndex === i}
              //   onClick={() => setSelectedIndex(i)}
            >
              <ToggleButtonGroup exclusive size="small" sx={{ marginRight: 1 }}>
                <ToggleButton
                  color="success"
                  value={true}
                  selected={value ? accept.includes(value) : accept.length === data.length}
                  onClick={handleToggle(value, true)}
                >
                  <AddIcon />
                </ToggleButton>
                <ToggleButton
                  color="info"
                  selected={
                    value
                      ? !accept.includes(value) && !reject.includes(value)
                      : accept.length === 0 && reject.length === 0
                  }
                  value={"none"}
                  onClick={handleToggle(value, null)}
                >
                  <QuestionMarkIcon />
                </ToggleButton>
                <ToggleButton
                  color="error"
                  selected={value ? reject.includes(value) : reject.length === data.length}
                  value={false}
                  onClick={handleToggle(value, false)}
                >
                  <RemoveIcon />
                </ToggleButton>
              </ToggleButtonGroup>
              <ListItemText primary={value ? value.text : "Select all"} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}
