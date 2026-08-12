from math import ceil

import torch
import torch.nn as nn
from pytorch_lightning.utilities.types import OptimizerLRSchedulerConfig
from transformers.optimization import get_linear_schedule_with_warmup


def configure_classifier_optimizer(
    model: nn.Module,
    base_model: nn.Module,
    freeze_base_model: bool,
    base_learning_rate: float,
    head_learning_rate: float,
    weight_decay: float,
    warmup_fraction: float,
    total_steps: int,
) -> OptimizerLRSchedulerConfig:
    """Configure discriminative learning rates with linear warmup and decay.

    During full fine-tuning, parameters owned by ``base_model`` use the base
    learning rate and all remaining trainable parameters use the head learning
    rate. When the base model is frozen, every remaining trainable parameter
    belongs to the head/adaptation group; this includes LoRA parameters.

    The scheduler increases both learning rates linearly from zero to their
    configured peaks during ``warmup_fraction`` of the optimizer steps, then
    decreases them linearly to zero while preserving their ratio.
    """
    trainable_parameters = [
        parameter for parameter in model.parameters() if parameter.requires_grad
    ]
    if freeze_base_model:
        parameter_groups = [
            {
                "params": trainable_parameters,
                "lr": head_learning_rate,
            }
        ]
    else:
        base_parameter_ids = {id(parameter) for parameter in base_model.parameters()}
        base_parameters = [
            parameter
            for parameter in trainable_parameters
            if id(parameter) in base_parameter_ids
        ]
        head_parameters = [
            parameter
            for parameter in trainable_parameters
            if id(parameter) not in base_parameter_ids
        ]
        parameter_groups = [
            {"params": base_parameters, "lr": base_learning_rate},
            {"params": head_parameters, "lr": head_learning_rate},
        ]

    optimizer = torch.optim.AdamW(
        parameter_groups,
        weight_decay=weight_decay,
        # Fused kernels only exist for CUDA; fall back on CPU/MPS.
        fused=torch.cuda.is_available(),
    )
    warmup_steps = ceil(total_steps * warmup_fraction)
    scheduler = get_linear_schedule_with_warmup(
        optimizer=optimizer,
        num_warmup_steps=warmup_steps,
        num_training_steps=total_steps,
    )
    return OptimizerLRSchedulerConfig(
        optimizer=optimizer,
        lr_scheduler={
            "scheduler": scheduler,
            "interval": "step",
            "frequency": 1,
        },
    )
