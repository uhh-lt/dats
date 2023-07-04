from ray import serve
import whisper_timestamped as whisper

@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={"min_replicas": 0, "max_replicas": 1},
)

class WhisperT:

    def __init__(self):
        model = "tiny"
        device = "cuda"
        self.model = whisper.load_model(model, device, "/entry/model/")

    def transcribe(self, input_audio: str):
        self.transcription = whisper.transcribe(self.model, input_audio)
        return self.transcription
    