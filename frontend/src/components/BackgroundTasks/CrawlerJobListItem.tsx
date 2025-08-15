import WebIcon from "@mui/icons-material/Web";
import { Link, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import DocProcessingHooks from "../../api/DocProcessingHooks.ts";
import { CrawlerJobRead } from "../../api/openapi/models/CrawlerJobRead.ts";
import { dateToLocaleString } from "../../utils/DateUtils.ts";
import JobListItem from "./JobListItem.tsx";

interface CrawlerJobListItemProps {
  initialCrawlerJob: CrawlerJobRead;
}

function CrawlerJobListItem({ initialCrawlerJob }: CrawlerJobListItemProps) {
  // global server state (react-query)
  const crawlerJob = DocProcessingHooks.usePollCrawlerJob(initialCrawlerJob.job_id, initialCrawlerJob);

  const dateString = useMemo(() => {
    return dateToLocaleString(initialCrawlerJob.created);
  }, [initialCrawlerJob.created]);

  if (crawlerJob.isSuccess) {
    return (
      <JobListItem
        jobStatus={crawlerJob.data.status}
        jobId={crawlerJob.data.job_id}
        title={`Crawler Job: ${crawlerJob.data.job_id}`}
        subTitle={dateString}
      >
        <List
          component="div"
          disablePadding
          dense
          sx={{ pl: 6 }}
          subheader={<ListSubheader>Downloaded URLs</ListSubheader>}
        >
          {crawlerJob.data.input.urls.map((url, index) => (
            <ListItemButton key={index} component={Link} href={url} target="_blank">
              <ListItemIcon>
                <WebIcon />
              </ListItemIcon>
              <ListItemText>
                <Typography variant="body2" color="textSecondary">
                  {url}
                </Typography>
              </ListItemText>
            </ListItemButton>
          ))}
        </List>
      </JobListItem>
    );
  } else {
    return null;
  }
}

export default memo(CrawlerJobListItem);
