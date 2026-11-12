from pathlib import Path


def audio_stream_path(video_path: Path) -> Path:
    """The file of the audio stream that `video_audio_extraction` extracts from the
    video at `video_path`, and that `audio_transcription` transcribes."""
    return video_path.with_suffix(".mp3")
