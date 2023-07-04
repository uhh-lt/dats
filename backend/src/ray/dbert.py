from transformers import pipeline
from ray import serve
import torch
from fastapi import APIRouter

router = APIRouter()


@serve.deployment(num_replicas=1)
@serve.ingress(router)
class APIIngress:
    def __init__(self, dbert_model_handle) -> None:
        self.dbert = dbert_model_handle
    
    @router.get("/classify")
    async def classify(self, sentence: str):
        predict_ref = await self.dbert.classify.remote(sentence)
        predict_result = await predict_ref
        return predict_result

@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={"min_replicas": 0, "max_replicas": 2},
)
class DistilBertModel:
    def __init__(self):
        self.classifier = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased",
            framework="pt",
            # Transformers requires you to pass device with index
            device=torch.device("cuda:0"),
        )

    def classify(self, sentence: str):
        return self.classifier(sentence)
    
if __name__ == "__main__":
    dbert = DistilBertModel.bind()
    APIIngress.bind(dbert)

