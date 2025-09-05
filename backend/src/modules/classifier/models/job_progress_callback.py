import pytorch_lightning as pl


class JobProgressCallback(pl.Callback):
    def __init__(self, job):
        super().__init__()
        self.job = job

    def on_validation_epoch_end(self, trainer, pl_module):
        # Get current epoch
        epoch = trainer.current_epoch

        # Get metrics from trainer.callback_metrics
        metrics = trainer.callback_metrics
        # These keys should match what you log in your LightningModule
        precision = metrics.get("eval_precision", None)
        recall = metrics.get("eval_recall", None)
        f1 = metrics.get("eval_f1", None)
        accuracy = metrics.get("eval_accuracy", None)

        # Format status message
        status_message = (
            f"Epoch {epoch}: "
            f"eval_precision={precision:.3f}, "
            f"eval_recall={recall:.3f}, "
            f"eval_f1={f1:.3f}, "
            f"eval_accuracy={accuracy:.3f}"
        )

        # Update job status
        self.job.update(status_message=status_message)
