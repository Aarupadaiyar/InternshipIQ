import pathlib

# Extend this package's __path__ to include the backend `app` directory,
# enabling imports like `from app.api import api_router` to resolve correctly.
backend_app_path = pathlib.Path(__file__).parent.parent / "backend" / "app"
if backend_app_path.is_dir():
    __path__.append(str(backend_app_path))
