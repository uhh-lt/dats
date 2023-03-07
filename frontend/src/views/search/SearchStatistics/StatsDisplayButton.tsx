import { Button, ButtonProps, Typography } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";

export interface StatsDisplayButtonProps {
  term: string;
  count: number;
  totalCount: number;
  maxCount: number;
  translateY: number;
  handleClick: Function;
}

function StatsDisplayButton({
  term,
  count,
  totalCount,
  maxCount,
  translateY,
  handleClick,
  ...btnProps
}: StatsDisplayButtonProps & ButtonProps) {
  const gradRatio = Math.sqrt(count / totalCount) * 100;
  const widthVal = Math.sqrt(totalCount / maxCount) * 100;

  return (
    <Tooltip title={term}>
      <div
        style={{
          width: widthVal + "%",
          height: 30,
          position: "absolute",
          top: 0,
          left: 0,
          transform: `translateY(${translateY}px)`,
          display: "flex",
          alignItems: "center",
        }}
        onClick={() => handleClick()}
      >
        <Typography
          fontSize={16}
          minWidth={100}
          maxWidth={100}
          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {term}
        </Typography>
        <Button
          style={{
            width: "100%",
            height: 30,
            float: "left",
            justifyContent: "left",
            marginRight: 2,
            paddingLeft: 3,
            color: "white",
            fontSize: 13,
            background: `linear-gradient(90deg, rgba(40,40,40,1) ${gradRatio}%, rgba(255,255,255,1) ${gradRatio}%, rgba(25, 118, 210,1) ${Math.min(
              gradRatio + 1,
              100
            )}%)`,
          }}
          {...(btnProps as ButtonProps)}
        >
          <b>{count}</b>
        </Button>
        <Typography fontSize={18}>{totalCount}</Typography>
      </div>
    </Tooltip>
  );
}

export default StatsDisplayButton;
