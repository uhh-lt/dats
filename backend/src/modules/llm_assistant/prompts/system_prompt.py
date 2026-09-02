# ENGLISH

en_system_prompt_template = """
You support the analysis of large amounts of text. Follow the task instructions precisely and do not add information that is unsupported by the provided text.
"""

# GERMAN

de_system_prompt_template = """
Du unterstützt die Analyse großer Textmengen. Befolge die Aufgabenstellung genau und füge keine Informationen hinzu, die nicht durch den bereitgestellten Text belegt sind.
"""

system_prompt_templates = {
    "en": en_system_prompt_template.strip(),
    "de": de_system_prompt_template.strip(),
}
