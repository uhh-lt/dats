import logging

from maverick_de import Maverick as GerCoref
from ray import serve

from config import build_ray_model_deployment_config, conf
from dto.coref import CorefJobInput, CorefJobOutput, CorefOutputDoc

logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("coref"))
class CorefModel:
    def __init__(self):
        self.model_ger = GerCoref(conf.coref.model_de)

    def predict(self, input: CorefJobInput) -> CorefJobOutput:
        if input.language == "de":
            model = self.model_ger
        else:
            raise ValueError(
                f"Unsupported language {input.language}! Only 'de' is currently supported."
            )

        results = []
        for doc in input.documents:
            prediction = model.predict(doc.tokens)
            od = CorefOutputDoc(
                id=doc.id, clusters=prediction["clusters_token_offsets"]
            )
            results.append(od)
        return CorefJobOutput(
            id=input.id, project_id=input.project_id, documents=results
        )
