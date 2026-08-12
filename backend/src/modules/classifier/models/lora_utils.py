from peft import LoraConfig, TaskType


def build_lora_config(
    rank: int,
    alpha: int,
    dropout: float,
    task_type: TaskType,
) -> LoraConfig:
    """Build the shared LoRA configuration for a classifier base model."""
    return LoraConfig(
        task_type=task_type,
        inference_mode=False,
        r=rank,
        lora_alpha=alpha,
        lora_dropout=dropout,
        target_modules="all-linear",
    )
