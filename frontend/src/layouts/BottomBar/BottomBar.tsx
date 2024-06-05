import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BarChartIcon from "@mui/icons-material/BarChart";
import BookIcon from "@mui/icons-material/Book";
import DescriptionIcon from "@mui/icons-material/Description";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import ImageSearchIcon from "@mui/icons-material/ImageSearch";
import SearchIcon from "@mui/icons-material/Search";
import ShortTextIcon from "@mui/icons-material/ShortText";
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import BottomNavigation, { BottomNavigationProps } from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

function calculateValue(path: string) {
  if (path.match(/project\/\d+\/.*search.*/i)) {
    return 0;
  } else if (path.match(/project\/\d+\/annotation.*/i)) {
    return 1;
  } else if (path.match(/project\/\d+\/analysis.*/i)) {
    return 2;
  } else if (path.match(/project\/\d+\/whiteboard.*/i)) {
    return 3;
  } else if (path.match(/project\/\d+\/logbook.*/i)) {
    return 4;
  }
}

function BottomBar(props: BottomNavigationProps) {
  const location = useLocation();
  const { projectId } = useParams();
  const value = calculateValue(location.pathname);

  // local state
  const [annotationPage, setAnnotationPage] = useState("annotation");

  // store the current page in the local state
  useEffect(() => {
    if (value === 1) {
      setAnnotationPage("annotation" + location.pathname.split("/annotation")[1]);
    }
  }, [location, value]);

  // search menu
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <BottomNavigation showLabels value={value} {...props}>
        <BottomNavigationAction
          label="Search"
          icon={<SearchIcon />}
          onClick={(event) => setAnchorEl(event.currentTarget)}
        />

        <BottomNavigationAction
          label="Annotation"
          icon={<FormatColorTextIcon />}
          component={Link}
          to={`/project/${projectId}/${annotationPage}`}
        />

        <BottomNavigationAction
          label="Analysis"
          icon={<BarChartIcon />}
          component={Link}
          to={`/project/${projectId}/analysis`}
        />

        <BottomNavigationAction
          label="Whiteboard"
          icon={<AccountTreeIcon />}
          component={Link}
          to={`/project/${projectId}/whiteboard`}
        />

        <BottomNavigationAction
          label="Logbook"
          icon={<BookIcon />}
          component={Link}
          to={`/project/${projectId}/logbook`}
        />
      </BottomNavigation>
      <Menu
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        open={open}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <MenuItem component={Link} to={`/project/${projectId}/imagesearch`} onClick={handleClose}>
          <ListItemIcon>
            <ImageSearchIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Image Search</ListItemText>
        </MenuItem>
        <MenuItem component={Link} to={`/project/${projectId}/sentencesearch`} onClick={handleClose}>
          <ListItemIcon>
            <ShortTextIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sentence Search</ListItemText>
        </MenuItem>
        <MenuItem component={Link} to={`/project/${projectId}/search`} onClick={handleClose}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Document Search</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export default BottomBar;
