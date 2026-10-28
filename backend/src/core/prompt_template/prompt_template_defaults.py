"""The default prompts every project starts with.

Every project gets one template per output format and language (see
``PromptTemplateService.create_default_prompt_templates``); the LLM Assistant
wizard runs them with its own selections. Changing a text here only affects new
projects; existing projects keep their stored versions.
"""

from core.prompt_template.prompt_template_enum import OutputFormat, PromptLanguage

_EN_TAGS = """
Please classify the document into all appropriate categories below. Multiple or zero categories are possible:
<tags>

<output-format:tags>

Document:
<document:whole>

Remember, you MUST classify the document using the provided categories, do not generate new categories!
"""

_DE_TAGS = """
Bitte klassifiziere das Dokument in alle passenden folgenden Kategorien. Es sind mehrere oder keine Kategorien möglich:
<tags>

<output-format:tags>

Dokument:
<document:whole>

Denke daran, das Dokument MUSS mithilfe der gegebenen Kategorien klassifiziert werden, generiere keine neuen Kategorien!
"""

_EN_METADATA = """
Please extract the following information from the provided document. It is possible that not all information is contained in the document:
<metadata_fields>

<output-format:metadata>

Document:
<document:whole>

Remember, you MUST extract the information verbatim from the document, do not generate facts!
"""

_DE_METADATA = """
Bitte extrahiere die folgenden Informationen aus dem Dokument. Es kann sein, dass nicht alle Informationen im Dokument enthalten sind:
<metadata_fields>

<output-format:metadata>

Dokument:
<document:whole>

Denke daran, die Informationen MÜSSEN wörtlich aus dem Dokument extrahiert werden, generiere keine Fakten!
"""

_EN_SENTENCES = """
Please use the following categories to classify sentences of the provided document:
<codes>

<output-format:sentences>

<examples>

This is the document, sentence by sentence:
<document:whole>

Remember you do not have to provide a category for each sentence. Only assign a category if you are sure that the category fits well to the sentence. Use only the provided categories!
"""

_DE_SENTENCES = """
Bitte nutze die folgenden Kategorien um Sätze des gegebenen Dokumentes zu klassifizieren:
<codes>

<output-format:sentences>

<examples>

Dies ist das Dokument, Satz für Satz:
<document:whole>

Denke daran, dass du nicht für jeden Satz eine Kategorie angeben musst. Vergebe nur eine Kategorie, wenn du dir sicher bist, dass die Kategorie gut zu dem Satz passt. Verwende ausschließlich die bereitgestellten Kategorien!
"""

_EN_INLINE = """
You are an assistant that identifies and classifies relevant text passages.

Allowed codes:
<code_names>

Code definitions:
<codes>

<output-format:inline>

<examples>

Text:
<document:whole>
"""

_DE_INLINE = """
Du bist ein Assistent, der relevante Textpassagen identifiziert und klassifiziert.

Erlaubte Codes:
<code_names>

Code-Definitionen:
<codes>

<output-format:inline>

<examples>

Text:
<document:whole>
"""

_EN_CONTEXT = """
You are an extraction engine that identifies relevant text passages.

Allowed codes:
<code_names>

Code definitions:
<codes>

<output-format:context>

<examples>

Text:
<document:chunks>
"""

_DE_CONTEXT = """
Du bist eine Extraktions-Engine, die relevante Textpassagen identifiziert.

Erlaubte Codes:
<code_names>

Code-Definitionen:
<codes>

<output-format:context>

<examples>

Text:
<document:chunks>
"""

DEFAULT_PROMPTS: dict[OutputFormat, dict[PromptLanguage, str]] = {
    OutputFormat.TAGS: {
        PromptLanguage.EN: _EN_TAGS.strip(),
        PromptLanguage.DE: _DE_TAGS.strip(),
    },
    OutputFormat.METADATA: {
        PromptLanguage.EN: _EN_METADATA.strip(),
        PromptLanguage.DE: _DE_METADATA.strip(),
    },
    OutputFormat.SENTENCES: {
        PromptLanguage.EN: _EN_SENTENCES.strip(),
        PromptLanguage.DE: _DE_SENTENCES.strip(),
    },
    OutputFormat.INLINE: {
        PromptLanguage.EN: _EN_INLINE.strip(),
        PromptLanguage.DE: _DE_INLINE.strip(),
    },
    OutputFormat.CONTEXT: {
        PromptLanguage.EN: _EN_CONTEXT.strip(),
        PromptLanguage.DE: _DE_CONTEXT.strip(),
    },
}
