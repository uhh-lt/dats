from peft import LoraConfig, TaskType


def build_lora_config(
    rank: int,
    alpha: int,
    dropout: float,
    task_type: TaskType,
) -> LoraConfig:
    """Build a LoRA configuration that adapts only the classifier base model.

    PEFT keeps token- and sequence-classification heads (named ``classifier`` or
    ``score``) fully trainable through ``modules_to_save``. Excluding those heads
    from ``all-linear`` prevents PEFT from first replacing them with LoRA layers.
    """
    classifier_head_modules = (
        ["classifier", "score"]
        if task_type in (TaskType.TOKEN_CLS, TaskType.SEQ_CLS)
        else None
    )
    return LoraConfig(
        task_type=task_type,
        inference_mode=False,
        r=rank,
        lora_alpha=alpha,
        lora_dropout=dropout,
        target_modules="all-linear",
        exclude_modules=classifier_head_modules,
    )
