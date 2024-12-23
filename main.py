import modal
import io
from fastapi import Request, Response, Query, HTTPException
from datetime import datetime, timezone
import requests

def download_model():
    from diffusers import AutoPipelineForText2Image
    import torch
    AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float16, variant="fp16")

image = (modal.Image.debian_slim()
         .pip_install("fastapi[standard]", "transformers", "accelerate", "diffusers", "requests")
         .run_function(download_model))

app = modal.App("image-gen", image=image)

@app.cls(image=image, gpu="A10G", container_idle_timeout=180)
class Model:
    # Load model weights when new Debian container is started
    @modal.build()
    @modal.enter()
    def load_weights(self):
        from diffusers import AutoPipelineForText2Image
        import torch
        self.pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float16, variant="fp16")
        self.pipe.to("cuda")
        self.API_KEY = "api_key"

    @modal.web_endpoint()
    def generate(self, request: Request, prompt: str = Query(..., description="Prompt to generate image")):
        api_key = request.headers.get("X-API-KEY")
        if api_key != self.API_KEY:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        image = self.pipe(prompt, num_inference_steps=1, guidance_scale=0.0).images[0]
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        return Response(content=buffer.getvalue(), media_type="image/jpeg")

    @modal.web_endpoint()
    def health(self):
        """Keep the container ready to serve requests"""
        return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.function(schedule=modal.Cron("*/3 * * * *"))
def keep_alive():
    health_url = "hearth_url"
    generate_url = "generate_url"
    
    health_response = requests.get(health_url)
    print(health_response)
    print(f"Health check at: {health_response.json()['timestamp']}")
    
    headers = {"X-API-KEY": "ak-QJrbfT0G2V2h3sfS627aRm"}
    generate_response = requests.get(generate_url, headers=headers)
    print(f"Generate endpoint tested successfully at: {datetime.now(timezone.utc).isoformat()}")
