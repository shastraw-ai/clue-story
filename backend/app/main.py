from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, kids, stories, settings as settings_router

settings = get_settings()

app = FastAPI(
    title="Clue Story API",
    description="Backend API for Clue Story - personalized bedtime stories with educational challenges",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(kids.router, prefix="/api/kids", tags=["kids"])
app.include_router(stories.router, prefix="/api/stories", tags=["stories"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["settings"])


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
