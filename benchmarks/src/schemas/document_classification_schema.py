from typing import Literal

from pydantic import BaseModel, Field


class NewsgroupClassificationSchemaV1(BaseModel):
    reasoning: str = Field(
        description="Short explanation of why this category was selected."
    )
    category: Literal[
        "alt.atheism",
        "comp.graphics",
        "sci.space",
        "talk.politics.mideast",
    ] = Field(description="The predicted category for the input document.")


class TagesschauCoarseClassificationSchemaV1(BaseModel):
    reasoning: str = Field(
        description="Nutze dieses Feld, um in 1-2 Sätzen zu analysieren, welche der erlaubten Kategorien am besten zum Dokument passt. Beende die Analyse mit einem kurzen Fazit, z.B. 'Daher ist die Kategorie XYZ am besten geeignet.'"
    )
    category: Literal[
        "inland",
        "ausland",
        "wirtschaft",
        "wissen",
    ] = Field(description="Die vorhergesagte Kategorie für das Eingabedokument.")


class TagesschauFineClassificationSchemaV1(BaseModel):
    reasoning: str = Field(
        description="Nutze dieses Feld, um in 1-2 Sätzen zu analysieren, welche der erlaubten Kategorien am besten zum Dokument passt. Beende die Analyse mit einem kurzen Fazit, z.B. 'Daher ist die Kategorie XYZ am besten geeignet.'"
    )
    category: Literal[
        "inland/deutschlandtrend",
        "inland/gesellschaft",
        "inland/innenpolitik",
        "inland/mittendrin",
        "ausland/afrika",
        "ausland/amerika",
        "ausland/asien",
        "ausland/europa",
        "ausland/ozeanien",
        "wirtschaft/boerse",
        "wirtschaft/finanzen",
        "wirtschaft/konjunktur",
        "wirtschaft/technologie",
        "wirtschaft/unternehmen",
        "wirtschaft/verbraucher",
        "wirtschaft/weltwirtschaft",
        "wissen/forschung",
        "wissen/gesundheit",
        "wissen/klima",
        "wissen/technologie",
    ] = Field(description="Die vorhergesagte Kategorie für das Eingabedokument.")


class BBCCoarseClassificationSchemaV1(BaseModel):
    reasoning: str = Field(
        description="Short explanation of why this category was selected."
    )
    category: Literal[
        "uk",
        "world",
        "sport",
        "misc",
    ] = Field(description="The predicted category for the input document.")


class BBCFineClassificationSchemaV1(BaseModel):
    reasoning: str = Field(
        description="Short explanation of why this category was selected."
    )
    category: Literal[
        "uk/england",
        "uk/scotland",
        "uk/wales",
        "uk/northern-ireland",
        "uk/politics",
        "world/africa",
        "world/asia",
        "world/australia",
        "world/europe",
        "world/latin-america",
        "world/middle-east",
        "world/us",
        "sport/athletics",
        "sport/boxing",
        "sport/cricket",
        "sport/football",
        "sport/formula1",
        "sport/rugby",
        "sport/tennis",
        "misc/business",
        "misc/education",
        "misc/election",
        "misc/entertainment",
        "misc/health",
        "misc/science",
        "misc/technology",
    ] = Field(description="The predicted category for the input document.")


class IMDBCoarseClassificationSchemaV1(BaseModel):
    reasoning: str = Field(
        description="Short explanation of why this category was selected."
    )
    category: Literal[
        "action",
        "adventure",
        "animation",
        "biography",
        "crime",
        "family",
        "fantasy",
        "film-noir",
        "history",
        "horror",
        "mystery",
        "romance",
        "scifi",
        "sports",
        "thriller",
        "war",
    ] = Field(description="The predicted category for the input document.")


class IMDBMultiLabelClassificationSchemaV1(BaseModel):
    reasoning: str = Field(
        description="Short explanation of why these categories were selected."
    )
    categories: list[
        Literal[
            "action",
            "adventure",
            "animation",
            "biography",
            "comedy",
            "crime",
            "drama",
            "family",
            "fantasy",
            "film-noir",
            "game-show",
            "history",
            "horror",
            "music",
            "musical",
            "mystery",
            "news",
            "reality-tv",
            "romance",
            "sci-fi",
            "sport",
            "talk-show",
            "thriller",
            "war",
            "western",
        ]
    ] = Field(
        min_length=1,
        description="A list of predicted categories for the input document.",
    )
