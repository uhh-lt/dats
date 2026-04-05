from pydantic import Field

from schemas.prediction.prediction_schema import BaseAnswerSchema


class TemplateFillingMUC4AnswerSchemaV1(BaseAnswerSchema):
    incident: list[str] = Field(
        default_factory=list,
        description="Incident type mentions extracted from the text.",
    )
    perpetrator: list[str] = Field(
        default_factory=list,
        description="Individual perpetrator mentions extracted from the text.",
    )
    group_perpetrator: list[str] = Field(
        default_factory=list,
        description="Group or organization perpetrator mentions extracted from the text.",
    )
    victim: list[str] = Field(
        default_factory=list,
        description="Victim mentions extracted from the text.",
    )
    target: list[str] = Field(
        default_factory=list,
        description="Target mentions extracted from the text.",
    )
    weapon: list[str] = Field(
        default_factory=list,
        description="Weapon mentions extracted from the text.",
    )

    def get_prediction(self) -> dict[str, list[str]]:
        return {
            "incident": self.incident,
            "perpetrator": self.perpetrator,
            "group_perpetrator": self.group_perpetrator,
            "victim": self.victim,
            "target": self.target,
            "weapon": self.weapon,
        }
