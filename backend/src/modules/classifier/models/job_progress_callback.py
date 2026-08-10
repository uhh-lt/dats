import pytorch_lightning as pl


class JobProgressCallback(pl.Callback):
    def __init__(self, job):
        super().__init__()
        self.job = job

    def on_validation_end(self, trainer):
        metrics = trainer.callback_metrics
        precision = metrics.get("eval_precision", None)
        recall = metrics.get("eval_recall", None)
        f1 = metrics.get("eval_f1", None)
        accuracy = metrics.get("eval_accuracy", None)

        # During the sanity-check validation run the metrics are not logged
        # yet, so there is nothing to report. Skip the update in that case.
        if precision is None or recall is None or f1 is None or accuracy is None:
            return

        # Get current epoch
        epoch = trainer.current_epoch

        # Format status message
        status_message = (
            f"Epoch {epoch}: "
            f"eval_precision={float(precision):.3f}, "
            f"eval_recall={float(recall):.3f}, "
            f"eval_f1={float(f1):.3f}, "
            f"eval_accuracy={float(accuracy):.3f}"
        )

        # Update job status
        self.job.update(status_message=status_message)
