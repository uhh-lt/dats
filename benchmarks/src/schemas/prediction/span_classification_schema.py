from typing import Literal

from pydantic import Field

from schemas.prediction.prediction_schema import SpanClassificationSchema, SpanPrediction


class FewnerdCoarseSpanPrediction(SpanPrediction):
    category: Literal[
        "art",
        "building",
        "event",
        "location",
        "organization",
        "other",
        "person",
        "product",
    ] = Field(description="The predicted coarse Few-NERD category.")


class FewnerdFineSpanPrediction(SpanPrediction):
    category: Literal[
        "art - broadcastprogram",
        "art - film",
        "art - music",
        "art - other",
        "art - painting",
        "art - writtenart",
        "building - airport",
        "building - hospital",
        "building - hotel",
        "building - library",
        "building - other",
        "building - restaurant",
        "building - sportsfacility",
        "building - theater",
        "event - attack/battle/war/militaryconflict",
        "event - disaster",
        "event - election",
        "event - other",
        "event - protest",
        "event - sportsevent",
        "location - GPE",
        "location - bodiesofwater",
        "location - island",
        "location - mountain",
        "location - other",
        "location - park",
        "location - road/railway/highway/transit",
        "organization - company",
        "organization - education",
        "organization - government/governmentagency",
        "organization - media/newspaper",
        "organization - other",
        "organization - politicalparty",
        "organization - religion",
        "organization - showorganization",
        "organization - sportsleague",
        "organization - sportsteam",
        "other - astronomything",
        "other - award",
        "other - biologything",
        "other - chemicalthing",
        "other - currency",
        "other - disease",
        "other - educationaldegree",
        "other - god",
        "other - language",
        "other - law",
        "other - livingthing",
        "other - medical",
        "person - actor",
        "person - artist/author",
        "person - athlete",
        "person - director",
        "person - other",
        "person - politician",
        "person - scholar",
        "person - soldier",
        "product - airplane",
        "product - car",
        "product - food",
        "product - game",
        "product - other",
        "product - ship",
        "product - software",
        "product - train",
        "product - weapon",
    ] = Field(description="The predicted fine-grained Few-NERD category.")


class GermanLERCoarseSpanPrediction(SpanPrediction):
    category: Literal[
        "person",
        "ort",
        "organisation",
        "norm",
        "gesetz",
        "rechtsprechung",
        "literatur",
    ] = Field(description="The predicted coarse German-LER category.")


class GermanLERFineSpanPrediction(SpanPrediction):
    category: Literal[
        "Person",
        "Anwalt",
        "Richter",
        "Land",
        "Stadt",
        "Straße",
        "Landschaft",
        "Organisation",
        "Unternehmen",
        "Institution",
        "Gericht",
        "Marke",
        "Gesetz",
        "Verordnung",
        "EU Norm",
        "Vorschrift",
        "Vertrag",
        "Gerichtsentscheidung",
        "Literatur",
    ] = Field(description="The predicted fine-grained German-LER category.")


class DirectQuotationSpanPrediction(SpanPrediction):
    category: Literal[
        "Sprecher",
        "Direkte Rede",
    ] = Field(description="The predicted direct-quotation category.")


class FewnerdCoarseSpanClassificationSchemaV1(SpanClassificationSchema):
    predictions: list[FewnerdCoarseSpanPrediction] = Field(default_factory=list)


class FewnerdFineSpanClassificationSchemaV1(SpanClassificationSchema):
    predictions: list[FewnerdFineSpanPrediction] = Field(default_factory=list)


class GermanLERCoarseSpanClassificationSchemaV1(SpanClassificationSchema):
    predictions: list[GermanLERCoarseSpanPrediction] = Field(default_factory=list)


class GermanLERFineSpanClassificationSchemaV1(SpanClassificationSchema):
    predictions: list[GermanLERFineSpanPrediction] = Field(default_factory=list)


class DirectQuotationSpanClassificationSchemaV1(SpanClassificationSchema):
    predictions: list[DirectQuotationSpanPrediction] = Field(default_factory=list)
