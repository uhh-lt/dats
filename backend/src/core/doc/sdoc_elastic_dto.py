from datetime import datetime

from pydantic import Field

from repos.elastic.elastic_dto_base import ElasticSearchModelBase


class ElasticSearchDocument(ElasticSearchModelBase):
    filename: str = Field(description="The filename of the SourceDocument")
    content: str = Field(description="The raw text of the SourceDocument")
    sdoc_id: int = Field(
        description="The ID of the SourceDocument as it is in the SQL DB"
    )
    project_id: int = Field(
        description="The ID of the Project the SourceDocument belongs to"
    )
    created: datetime = Field(
        description="The created date of the SourceDocument", default=datetime.now()
    )

    def get_id(self) -> int:
        """
        Returns the ID of the ElasticSearchObject as it is in the SQL DB.
        """
        return self.sdoc_id


class ElasticSearchDocumentCreate(ElasticSearchDocument):
    pass


class ElasticSearchDocumentUpdate(ElasticSearchModelBase):
    pass
