from app.core.data.dto.llm_job import LLMJobType

# DOCUMENT TAGGING
en_doc_tagging_prompt = """
Please classify the document into all appropriate categories below. Multiple categories are possible:
{}.

Please answer in this format. The reasoning is optional.
Category: <category 1>, <category 2>, ...
Reason: <reason>

Document:
{}
"""

de_doc_tagging_prompt = """
Bitte klassifiziere das Dokument in alle passenden folgenden Kategorien. Es sind mehrere Kategorien möglich:
{}.

Bitte anworte in diesem Format. Die Begründung ist optional.
Kategorie: <Kategorie 1>, <Kategorie 2>, ...
Begründung: <Begründung>

Dokument:
{}
"""

# METADATA EXTRACTION
en_metadata_extraction_prompt = """
Please classify the document into all appropriate categories below. Multiple categories are possible:
{}.

Please answer in this format. The reasoning is optional.
Category: <category 1>, <category 2>, ...
Reason: <reason>

Document:
{}
"""

de_metadata_extraction_prompt = """
Bitte klassifiziere das Dokument in alle passenden folgenden Kategorien. Es sind mehrere Kategorien möglich:
{}.

Bitte anworte in diesem Format. Die Begründung ist optional.
Kategorie: <Kategorie 1>, <Kategorie 2>, ...
Begründung: <Begründung>

Dokument:
{}
"""

# ANNOTATION
en_annotation_prompt = """
Please classify the document into all appropriate categories below. Multiple categories are possible:
{}.

Please answer in this format. The reasoning is optional.
Category: <category 1>, <category 2>, ...
Reason: <reason>

Document:
{}
"""

de_annotation_prompt = """
Bitte klassifiziere das Dokument in alle passenden folgenden Kategorien. Es sind mehrere Kategorien möglich:
{}.

Bitte anworte in diesem Format. Die Begründung ist optional.
Kategorie: <Kategorie 1>, <Kategorie 2>, ...
Begründung: <Begründung>

Dokument:
{}
"""

# EXPORTS

category_word = {
    "en": "Category",
    "de": "Kategorie",
}

reason_word = {
    "en": "Reason",
    "de": "Begründung",
}

system_prompts = {
    "en": "You are a system to support the analysis of large amounts of text. You will always answer in the required format and use no other formatting than expected by the user!",
    "de": "Du bist ein System zur Unterstützung bei der Analyse großer Textmengen. Du antwortest immer in dem geforderten Format und verwendest keine andere Formatierung als vom Benutzer erwartet!",
}

user_prompt_templates = {
    "en": {
        LLMJobType.DOCUMENT_TAGGING: en_doc_tagging_prompt,
        LLMJobType.METADATA_EXTRACTION: en_metadata_extraction_prompt,
        LLMJobType.ANNOTATION: en_annotation_prompt,
    },
    "de": {
        LLMJobType.DOCUMENT_TAGGING: de_doc_tagging_prompt,
        LLMJobType.METADATA_EXTRACTION: de_metadata_extraction_prompt,
        LLMJobType.ANNOTATION: de_annotation_prompt,
    },
}
