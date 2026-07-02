import { Button, ButtonProps, Typography } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";

export interface StatsDisplayButtonProps {
  term: string;
  count: number;
  totalCount: number;
  maxCount: number;
  translateY: number;
  handleClick: React.MouseEventHandler<HTMLDivElement>;
  tooltipPlacement?: "top" | "bottom" | "left" | "right";
}

export function StatsDisplayButton({
  term,
  count,
  totalCount,
  maxCount,
  translateY,
  handleClick,
  tooltipPlacement,
  ...btnProps
}: StatsDisplayButtonProps & ButtonProps) {
  const gradRatio = Math.sqrt(count / totalCount) * 100;
  const widthVal = Math.sqrt(totalCount / maxCount) * 100;

  return (
    <div
      style={{
        width: "100%",
        height: 30,
        position: "absolute",
        top: 0,
        left: 0,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        alignItems: "center",
      }}
      onClick={handleClick}
    >
      <Tooltip title={term} placement={tooltipPlacement}>
        <Typography
          fontSize={16}
          minWidth={100}
          maxWidth={100}
          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {term}
        </Typography>
      </Tooltip>
      <div style={{ width: "100%", marginRight: 2 }}>
        <Button
          style={{
            width: widthVal + "%",
            height: 30,
            float: "left",
            justifyContent: "left",
            color: "white",
            fontSize: 13,
            background: `linear-gradient(90deg, rgba(40,40,40,1) ${gradRatio}%, rgba(255,255,255,1) ${gradRatio}%, rgba(25, 118, 210,1) ${Math.min(
              gradRatio + 1,
              100,
            )}%)`,
          }}
          {...(btnProps as ButtonProps)}
        >
          <b>{count}</b>
        </Button>
      </div>
      <Typography fontSize={18}>{totalCount}</Typography>
    </div>
  );
}
