import { CodeHooks } from "@api/hooks/CodeHooks";
import { SpanEntityStat } from "@api/models/SpanEntityStat";
import MenuIcon from "@mui/icons-material/Menu";
import PublicIcon from "@mui/icons-material/Public";
import PublicOffIcon from "@mui/icons-material/PublicOff";
import SearchIcon from "@mui/icons-material/Search";
import { TabContext } from "@mui/lab";
import { Box, BoxProps, IconButton, Stack, Tab, Tabs, TextField, Tooltip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { ChangeEvent, SyntheticEvent, useCallback, useState } from "react";
import { SearchActions } from "../../store/documentSearchSlice";
import { CodeStats } from "./_components/CodeStats";
import { DocumentTagStats } from "./_components/DocumentTagStats";
import { KeywordStats } from "./_components/KeywordStats";
import { SearchStatisticsMenu } from "./_components/SearchStatisticsMenu";

interface SearchStatisticsProps {
  projectId: number;
  sdocIds?: number[];
  handleKeywordClick: (keyword: string) => void;
  handleTagClick: (tagId: number) => void;
  handleCodeClick: (stat: SpanEntityStat) => void;
}

export function SearchStatistics({
  projectId,
  sdocIds,
  handleCodeClick,
  handleKeywordClick,
  handleTagClick,
  ...props
}: SearchStatisticsProps & BoxProps) {
  // tabs
  const [tab, setTab] = useState("keywords");
  const handleTabChange = (_event: SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };

  // query all codes of the current project
  const projectCodes = CodeHooks.useGetEnabledCodes();

  // menu
  const handleMenuItemClick = useCallback((navigateTo: string) => {
    setTab(navigateTo);
  }, []);

  // stats search bar value state initialisation
  const [filterStatsBy, setFilterStatsBy] = useState("");
  const handleSearchTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilterStatsBy(event.target.value);
  };

  // toggle sort by global
  const dispatch = useAppDispatch();
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);
  const toggleSortStatsByGlobal = () => {
    dispatch(SearchActions.onToggleSortStatsByGlobal());
  };

  // The scrollable element for the lists
  const [parentElement, setParentElement] = useState<HTMLDivElement | null>(null);

  return (
    <Box {...(props as BoxProps)} className={`myFlexContainer ${props.className}`}>
      <TabContext value={tab}>
        <Stack
          direction="row"
          alignItems="center"
          sx={{ borderBottom: 1, borderColor: "divider" }}
          className="myFlexFitContentContainer"
        >
          <SearchStatisticsMenu
            menuItems={projectCodes.data || []}
            handleMenuItemClick={handleMenuItemClick}
            renderButton={(onClick) => (
              <IconButton onClick={onClick} sx={{ ml: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
          />
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
            <Tab label="Keywords" value="keywords" />
            <Tab label="Tags" value="tags" />
            {projectCodes.data?.map((code) => (
              <Tab key={code.id} label={code.name} value={`${code.id}`} />
            ))}
          </Tabs>
        </Stack>

        {/* Stats Searchbar Component */}
        <Box className="myFlexFitContentContainer" sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" spacing={2} pl={2}>
            <SearchIcon sx={{ color: "dimgray" }} />
            <TextField
              sx={{ "& fieldset": { border: "none" }, input: { color: "dimgray", paddingY: "12px" } }}
              placeholder="Search..."
              variant="outlined"
              onChange={handleSearchTextChange}
              fullWidth
            />
            <Tooltip title="Sort stats by global">
              <IconButton onClick={toggleSortStatsByGlobal}>
                {sortStatsByGlobal ? <PublicIcon /> : <PublicOffIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <Box ref={setParentElement} className="myFlexFillAllContainer" p={2}>
          <KeywordStats
            sdocIds={sdocIds}
            currentTab={tab}
            projectId={projectId}
            handleClick={handleKeywordClick}
            parentElement={parentElement}
            filterBy={filterStatsBy}
          />
          <DocumentTagStats
            sdocIds={sdocIds}
            currentTab={tab}
            projectId={projectId}
            handleClick={handleTagClick}
            parentElement={parentElement}
            filterBy={filterStatsBy}
          />
          {projectCodes.data?.map((code) => (
            <CodeStats
              sdocIds={sdocIds}
              currentTab={tab}
              key={code.id}
              codeId={code.id}
              handleClick={handleCodeClick}
              parentElement={parentElement}
              filterBy={filterStatsBy}
            />
          ))}
        </Box>
      </TabContext>
    </Box>
  );
}
