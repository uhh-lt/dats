import { Card, CardActionArea, CardContent, CardHeader } from "@mui/material";

interface CreateTableCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

function CreateTableCard({ title, description, onClick }: CreateTableCardProps) {
  return (
    <Card
      style={{
        width: "250px",
        height: "300px",
        marginRight: "16px",
        display: "inline-block",
        whiteSpace: "normal",
      }}
      variant="outlined"
    >
      <CardActionArea
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
        onClick={onClick}
      >
        <CardHeader title={title} />
        <CardContent>{description}</CardContent>
      </CardActionArea>
    </Card>
  );
}

export default CreateTableCard;
