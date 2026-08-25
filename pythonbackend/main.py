from fastapi import FastAPI

from pythonbackend.api.conjunctions import router as conjunction_router
from pythonbackend.api.propagation import router as propagation_router


app = FastAPI(
    title="OrbitX Scientific Service",
    version="0.1.0",
)


app.include_router(propagation_router)
app.include_router(conjunction_router)


@app.get("/")
def root():
    return {
        "message": "OrbitX Scientific Service API is running"
    }
