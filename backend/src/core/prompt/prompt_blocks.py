"""The fixed texts the blocks of a prompt are rendered with, per language.

The answer instructions belong to <output-format:format>, because the parser of
the format relies on them. Users write everything around the blocks.
"""

from common.meta_type_enum import MetaType
from core.prompt.prompt_enum import OutputFormat, PromptLanguage

_EN_INLINE = """
Rules:
- Repeat the original text with relevant passages wrapped in inline XML-style tags (e.g. <CODE>text</CODE>)
- Use the allowed code name exactly as the tag name, including spaces and punctuation
- Do NOT add or remove characters outside of tags
- Do NOT change whitespace or punctuation
- Codes must not overlap or nest
- Wrap only the text passages that are relevant to an allowed code; do not include unrelated surrounding text
- If no relevant text that fits the codes is present, return the text unchanged{reasoning_rule}

Example:
Input:
The survey results support the proposal.

Output:
The <EVIDENCE>survey results</EVIDENCE> support the proposal.{reasoning_example}
"""

_DE_INLINE = """
Regeln:
- Wiederhole den Originaltext und umschließe relevante Passagen mit Inline-XML-Tags (z. B. <CODE>Text</CODE>)
- Verwende den erlaubten Code-Namen exakt als Tag-Namen, einschließlich Leerzeichen und Satzzeichen
- Füge außerhalb der Tags keine Zeichen hinzu und entferne keine
- Ändere keine Leerzeichen oder Satzzeichen
- Annotationen dürfen sich nicht überlappen oder verschachtelt sein
- Umschließe nur Textpassagen, die für einen erlaubten Code relevant sind; schließe keinen irrelevanten umgebenden Text ein
- Wenn keine Textpassage passend zu den Codes ist, gib den Text unverändert zurück{reasoning_rule}

Beispiel:
Eingabe:
Die Umfrageergebnisse stützen den Vorschlag.

Ausgabe:
Die <BELEG>Umfrageergebnisse</BELEG> stützen den Vorschlag.{reasoning_example}
"""

_EN_CONTEXT = """
Rules:
- Extract passages matching the code system.
- For each relevant text passage, identify the category, the exact verbatim quote, and the surrounding context.
- The exact_quote MUST be copied verbatim from the text (do not change whitespace or punctuation).
- The exact_quote must contain ONLY the extracted passage. Do not include context, field names, explanations, character counts, or serialized data in it.
- Provide up to {context_before_chars} characters of context_before and {context_after_chars} characters of context_after to uniquely locate the quote.
- The context fields must contain only verbatim text immediately before or after the exact quote.
- Do NOT generate passages that are not present in the text.
- If no relevant text fits the codes, return no passages.{reasoning_rule}

Example text:
The report concludes that the policy reduced emissions substantially.

Expected passage:
Category: CLAIM
Exact quote: the policy reduced emissions
"""

_DE_CONTEXT = """
Regeln:
- Extrahiere Passagen, die zum Code-System passen.
- Gib für jede relevante Textpassage die Kategorie, das exakte wörtliche Zitat und den umgebenden Kontext an.
- Das exact_quote MUSS wörtlich aus dem Text kopiert werden (keine Änderung von Leerzeichen oder Satzzeichen).
- Das exact_quote darf NUR die extrahierte Passage enthalten. Füge dort keinen Kontext, keine Feldnamen, Erklärungen, Zeichenanzahlen oder serialisierten Daten ein.
- Gib bis zu {context_before_chars} Zeichen context_before und {context_after_chars} Zeichen context_after an, um das Zitat eindeutig zu lokalisieren.
- Die Kontextfelder dürfen nur den wörtlichen Text unmittelbar vor oder nach dem exakten Zitat enthalten.
- Generiere KEINE Textpassagen, die nicht im Text vorhanden sind.
- Wenn keine passende Textpassage zu den Codes vorhanden ist, gib keine Passagen zurück.{reasoning_rule}

Beispieltext:
Der Bericht zeigt, dass die Maßnahme die Emissionen deutlich senkte.

Erwartete Passage:
Kategorie: BEHAUPTUNG
Exaktes Zitat: die Maßnahme die Emissionen deutlich senkte
"""

_EN_SENTENCES = """
Classify only sentences that clearly fit. Identify them by sentence number, use only the provided categories{reasoning_rule}.

e.g.
Sentence ID: 2
Category: Claim{reasoning_example}
"""

_DE_SENTENCES = """
Klassifiziere nur Sätze, auf die eine Kategorie eindeutig passt. Identifiziere sie anhand der Satznummer, verwende nur die bereitgestellten Kategorien{reasoning_rule}.

e.g.
Satz-ID: 2
Kategorie: Behauptung{reasoning_example}
"""

_EN_TAGS = """
Select only from the provided categories and briefly explain your selection.

e.g.
Category: Sports
Explanation: This document is about sports.
"""

_DE_TAGS = """
Wähle ausschließlich aus den bereitgestellten Kategorien und begründe deine Auswahl kurz.

e.g.
Kategorie: Sport
Begründung: Das Dokument handelt von Sport.
"""

_EN_METADATA = """
Use the following value requirements. If information is not contained in the document, omit that field:
{metadata_answer_template}

Example values:
{metadata_example}
"""

_DE_METADATA = """
Beachte die folgenden Anforderungen an die Werte. Wenn eine Information nicht im Dokument enthalten ist, überspringe das Feld:
{metadata_answer_template}

Beispielwerte:
{metadata_example}
"""

# the context lines of the example end with spaces, which the source must not
_EN_CONTEXT_EXAMPLE = (
    "Context before: The report concludes that \nContext after:  substantially"
)
_DE_CONTEXT_EXAMPLE = "Kontext davor: Der Bericht zeigt, dass \nKontext danach: ."

# str.format templates; the renderer fills the settings and selections
OUTPUT_FORMAT_INSTRUCTIONS: dict[OutputFormat, dict[PromptLanguage, str]] = {
    OutputFormat.INLINE: {
        PromptLanguage.EN: _EN_INLINE.strip(),
        PromptLanguage.DE: _DE_INLINE.strip(),
    },
    OutputFormat.CONTEXT: {
        PromptLanguage.EN: _EN_CONTEXT.strip()
        + "\n"
        + _EN_CONTEXT_EXAMPLE
        + "{reasoning_example}",
        PromptLanguage.DE: _DE_CONTEXT.strip()
        + "\n"
        + _DE_CONTEXT_EXAMPLE
        + "{reasoning_example}",
    },
    OutputFormat.SENTENCES: {
        PromptLanguage.EN: _EN_SENTENCES.strip(),
        PromptLanguage.DE: _DE_SENTENCES.strip(),
    },
    OutputFormat.TAGS: {
        PromptLanguage.EN: _EN_TAGS.strip(),
        PromptLanguage.DE: _DE_TAGS.strip(),
    },
    OutputFormat.METADATA: {
        PromptLanguage.EN: _EN_METADATA.strip(),
        PromptLanguage.DE: _DE_METADATA.strip(),
    },
}

# the reasoning parts ({reasoning_rule}, {reasoning_example}) of the annotation
# formats' instructions, without and with PromptSettings.request_reasoning
REASONING_NOT_REQUESTED: dict[OutputFormat, dict[PromptLanguage, dict[str, str]]] = {
    OutputFormat.INLINE: {
        PromptLanguage.EN: {"reasoning_rule": "", "reasoning_example": ""},
        PromptLanguage.DE: {"reasoning_rule": "", "reasoning_example": ""},
    },
    OutputFormat.CONTEXT: {
        PromptLanguage.EN: {"reasoning_rule": "", "reasoning_example": ""},
        PromptLanguage.DE: {"reasoning_rule": "", "reasoning_example": ""},
    },
    OutputFormat.SENTENCES: {
        PromptLanguage.EN: {
            "reasoning_rule": ", and do not provide reasoning",
            "reasoning_example": "",
        },
        PromptLanguage.DE: {
            "reasoning_rule": " und gib keine Begründung an",
            "reasoning_example": "",
        },
    },
}
REASONING_REQUESTED: dict[OutputFormat, dict[PromptLanguage, dict[str, str]]] = {
    OutputFormat.INLINE: {
        PromptLanguage.EN: {
            "reasoning_rule": (
                "\n- For every tagged passage, in the order of the tags, also give "
                "the passage and a short reasoning (one or two sentences) why it "
                "fits its code"
            ),
            "reasoning_example": (
                "\n\nReasonings:\nPassage: survey results\n"
                "Reasoning: The survey results are presented as evidence for the "
                "proposal."
            ),
        },
        PromptLanguage.DE: {
            "reasoning_rule": (
                "\n- Gib für jede umschlossene Passage, in der Reihenfolge der Tags, "
                "zusätzlich die Passage und eine kurze Begründung (ein bis zwei "
                "Sätze) an, warum sie zu ihrem Code passt"
            ),
            "reasoning_example": (
                "\n\nBegründungen:\nPassage: Umfrageergebnisse\n"
                "Begründung: Die Umfrageergebnisse werden als Beleg für den "
                "Vorschlag angeführt."
            ),
        },
    },
    OutputFormat.CONTEXT: {
        PromptLanguage.EN: {
            "reasoning_rule": (
                "\n- For every passage, give a short reasoning (one or two "
                "sentences) why it fits its category."
            ),
            "reasoning_example": (
                "\nReasoning: The report presents the reduced emissions as its "
                "conclusion."
            ),
        },
        PromptLanguage.DE: {
            "reasoning_rule": (
                "\n- Gib für jede Passage eine kurze Begründung (ein bis zwei Sätze) "
                "an, warum sie zu ihrer Kategorie passt."
            ),
            "reasoning_example": (
                "\nBegründung: Der Bericht stellt die gesenkten Emissionen als sein "
                "Ergebnis dar."
            ),
        },
    },
    OutputFormat.SENTENCES: {
        PromptLanguage.EN: {
            "reasoning_rule": (
                ", and briefly explain each classification in one or two sentences"
            ),
            "reasoning_example": (
                "\nReasoning: The sentence asserts a position without evidence."
            ),
        },
        PromptLanguage.DE: {
            "reasoning_rule": (
                " und begründe jede Klassifikation kurz in ein bis zwei Sätzen"
            ),
            "reasoning_example": (
                "\nBegründung: Der Satz vertritt eine Position ohne Beleg."
            ),
        },
    },
}

# the expected value of a metadata field and an example value, per type
METADATA_ANSWER_TEMPLATES: dict[MetaType, str] = {
    MetaType.STRING: "<extracted text>",
    MetaType.NUMBER: "<number without commas, e.g., 1250>",
    MetaType.DATE: "<YYYY-MM-DD>",
    MetaType.BOOLEAN: "<True/False>",
    MetaType.LIST: "<item1, item2, item3>",
}
METADATA_EXAMPLE_VALUES: dict[MetaType, str] = {
    MetaType.STRING: "relevant information here",
    MetaType.NUMBER: "42",
    MetaType.DATE: "2024-01-01",
    MetaType.BOOLEAN: "True",
    MetaType.LIST: "info1, info2, info3",
}

# labels of the rendered few-shot examples
INLINE_EXAMPLE_LABELS: dict[PromptLanguage, dict[str, str]] = {
    PromptLanguage.EN: {"header": "Examples:", "input": "Input", "output": "Output"},
    PromptLanguage.DE: {
        "header": "Beispiele:",
        "input": "Eingabe",
        "output": "Ausgabe",
    },
}
CONTEXT_EXAMPLE_LABELS: dict[PromptLanguage, dict[str, str]] = {
    PromptLanguage.EN: {
        "header": "Examples:",
        "text": "Example text",
        "passages": "Expected passages",
        "category": "Category",
        "quote": "Exact quote",
        "context_before": "Context before",
        "context_after": "Context after",
    },
    PromptLanguage.DE: {
        "header": "Beispiele:",
        "text": "Beispieltext",
        "passages": "Erwartete Passagen",
        "category": "Kategorie",
        "quote": "Exaktes Zitat",
        "context_before": "Kontext davor",
        "context_after": "Kontext danach",
    },
}
SENTENCE_EXAMPLES_HEADERS: dict[PromptLanguage, str] = {
    PromptLanguage.EN: "Examples of sentences for each category:",
    PromptLanguage.DE: "Beispielsätze für jede Kategorie:",
}
