import { MenuBook } from "@mui/icons-material";
import BarChartIcon from "@mui/icons-material/BarChart";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BookIcon from "@mui/icons-material/Book";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import SearchIcon from "@mui/icons-material/Search";
import BottomNavigation, { BottomNavigationProps } from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import * as React from "react";
import { Link, useLocation, useParams } from "react-router-dom";

function calculateValue(path: string) {
  if (path.match(/project\/\d+\/search.*/i)) {
    return 0;
  } else if (path.match(/project\/\d+\/annotation.*/i)) {
    return 1;
  } else if (path.match(/project\/\d+\/analysis.*/i)) {
    return 2;
  } else if (path.match(/project\/\d+\/whiteboard.*/i)) {
    return 3;
  } else if (path.match(/project\/\d+\/logbook.*/i)) {
    return 4;
  } else if (path.match(/project\/\d+\/autologbook.*/i)) {
    return 5;
  }
}

function BottomBar(props: BottomNavigationProps) {
  const location = useLocation();
  let { projectId } = useParams();
  const value = calculateValue(location.pathname);

  // local state
  const [searchPage, setSearchPage] = React.useState("search");
  const [annotationPage, setAnnotationPage] = React.useState("annotation");

  // store the current page in the local state
  React.useEffect(() => {
    if (value === 0) {
      setSearchPage("search" + location.pathname.split("/search")[1]);
    }
    if (value === 1) {
      setAnnotationPage("annotation" + location.pathname.split("/annotation")[1]);
    }
  }, [location, value]);

  return (
    <BottomNavigation showLabels value={value} {...props}>
      <BottomNavigationAction
        label="Search"
        icon={<SearchIcon />}
        component={Link}
        to={`/project/${projectId}/${searchPage}`}
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

      <BottomNavigationAction
        label="Autologbook"
        icon={<MenuBook />}
        component={Link}
        to={`/project/${projectId}/autologbook`}
      />
    </BottomNavigation>
  );
}

export default BottomBar;
