from fastapi import FastAPI
from propagation import router as propagation_router

app = FastAPI()

@app.get("/")
def root():
    return {"message":"The service is working fine"}

app.include_router(propagation_router)


