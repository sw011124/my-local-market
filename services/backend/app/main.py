from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import addresses, admin, auth, cart, checkout, orders, public
from app.core import get_settings
from app.services import DomainError

settings = get_settings()
app = FastAPI(title=settings.app_name, version='0.1.0')

origins = [item.strip() for item in settings.cors_origins.split(',')] if settings.cors_origins else ['*']
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.exception_handler(DomainError)
async def domain_error_handler(_: Request, exc: DomainError):
    return JSONResponse(
        status_code=400,
        content={'code': exc.code, 'message': exc.message},
    )


@app.get('/healthz')
def healthz() -> dict:
    return {'ok': True}


app.include_router(public.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(cart.router, prefix=settings.api_prefix)
app.include_router(addresses.router, prefix=settings.api_prefix)
app.include_router(checkout.router, prefix=settings.api_prefix)
app.include_router(orders.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)
