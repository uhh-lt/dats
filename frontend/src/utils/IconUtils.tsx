import AnalyticsIcon from "@mui/icons-material/Analytics";
import ArticleIcon from "@mui/icons-material/Article";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EditIcon from "@mui/icons-material/Edit";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import HomeIcon from "@mui/icons-material/Home";
import LayersIcon from "@mui/icons-material/Layers";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";

export enum Icon {
  HOME = "home",
  DASHBOARD = "dashboard",
  SEARCH = "search",
  ARTICLE = "article",
  ANNOTATION = "edit",
  ANALYTICS = "analytics",
  WHITEBOARD = "layers",
  LOGBOOK = "menu_book",
  SETTINGS = "settings",
  TUNE = "tune",
  LIST = "list",
}

// Map from enum to actual icon component
export const getIconComponent = (icon: Icon): React.ReactElement => {
  switch (icon) {
    case Icon.HOME:
      return <HomeIcon fontSize="small" />;
    case Icon.DASHBOARD:
      return <DashboardIcon fontSize="small" />;
    case Icon.SEARCH:
      return <SearchIcon fontSize="small" />;
    case Icon.ARTICLE:
      return <ArticleIcon fontSize="small" />;
    case Icon.ANNOTATION:
      return <EditIcon fontSize="small" />;
    case Icon.ANALYTICS:
      return <AnalyticsIcon fontSize="small" />;
    case Icon.WHITEBOARD:
      return <LayersIcon fontSize="small" />;
    case Icon.LOGBOOK:
      return <MenuBookIcon fontSize="small" />;
    case Icon.SETTINGS:
      return <SettingsIcon fontSize="small" />;
    case Icon.TUNE:
      return <TuneIcon fontSize="small" />;
    case Icon.LIST:
      return <FormatListBulletedIcon fontSize="small" />;
    default:
      return <ArticleIcon fontSize="small" />;
  }
};
