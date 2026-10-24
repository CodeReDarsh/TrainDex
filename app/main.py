import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import router

app = FastAPI(
    title="TrainDex Rollsign Reference API",
    version="0.1.0",
    description="Evidence-based design references and heuristic candidate retrieval. No Gemini calls.",
)
app.include_router(router)


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError):
    # Do not return SQL parameters, credentials, or database diagnostics to callers.
    logging.getLogger(__name__).error("Database operation failed (%s)", type(exc).__name__)
    return JSONResponse(status_code=503, content={"detail": "Database temporarily unavailable"})
