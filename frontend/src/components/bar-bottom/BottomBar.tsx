import * as React from "react";
import BottomNavigation, { BottomNavigationProps } from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import BookIcon from "@mui/icons-material/Book";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import { Link, useLocation, useParams } from "react-router-dom";

function calculateValue(path: string) {
  if (path.match(/project\/\d+\/search.*/i)) {
    return 0;
  } else if (path.match(/project\/\d+\/annotation.*/i)) {
    return 1;
  } else if (path.match(/project\/\d+\/analysis.*/i)) {
    return 2;
  } else if (path.match(/project\/\d+\/logbook.*/i)) {
    return 3;
  }
}

function BottomBar(props: BottomNavigationProps) {
  const location = useLocation();
  let { projectId } = useParams();
  const value = calculateValue(location.pathname);

  return (
    <BottomNavigation showLabels value={value} {...props}>
      <BottomNavigationAction
        label="Search"
        icon={<SearchIcon />}
        component={Link}
        to={`/project/${projectId}/search`}
      />

      <BottomNavigationAction
        label="Annotation"
        icon={<FormatColorTextIcon />}
        component={Link}
        to={`/project/${projectId}/annotation`}
      />

      <BottomNavigationAction
        label="Analysis"
        icon={<BarChartIcon />}
        component={Link}
        to={`/project/${projectId}/analysis`}
      />

      <BottomNavigationAction
        label="Logbook"
        icon={<BookIcon />}
        component={Link}
        to={`/project/${projectId}/logbook`}
      />
    </BottomNavigation>
  );
}

export default BottomBar;
