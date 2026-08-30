from fastapi import FastAPI

from pythonbackend.api.conjunctions import router as conjunction_router
from pythonbackend.api.health import router as health_router
from pythonbackend.api.propagation import router as propagation_router
from pythonbackend.api.satellite_state import router as satellite_state_router
from pythonbackend.api.trajectory import router as trajectory_router
app = FastAPI(
    title="OrbitX Scientific Service",
    version="0.1.0",
)


app.include_router(health_router)
app.include_router(propagation_router)
app.include_router(conjunction_router)
app.include_router(satellite_state_router)
app.include_router(trajectory_router)

@app.get("/")
def root():
    return {
        "message": "OrbitX Scientific Service API is running"
    }
