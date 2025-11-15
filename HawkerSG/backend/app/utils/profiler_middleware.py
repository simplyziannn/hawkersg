from pyinstrument import Profiler
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.background import BackgroundTask
import os

# Define a directory to save profile results
PROFILE_DIR = os.path.join(os.getcwd(), "profiles")
os.makedirs(PROFILE_DIR, exist_ok=True)

class PyInstrumentProfilerMiddleware(BaseHTTPMiddleware):
    """
    A middleware to profile FastAPI requests using Pyinstrument.
    The profiler is activated by adding ?profile=true to the request URL.
    Results are saved as HTML flame graphs in the 'profiles' directory.
    """
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # 1. Check if the profiling is requested via query parameter
        if "profile" not in request.query_params or request.query_params["profile"].lower() != "true":
            return await call_next(request)

        # 2. Start the profiler
        profiler = Profiler(async_mode="enabled")
        
        with profiler:
            response = await call_next(request)
        
        # 3. Stop and process the profile
        # Use the route path for the filename
        route_path = request.scope.get('path', 'unknown').replace('/', '_').strip('_')
        filename = f"{route_path}_profile.html"
        output_path = os.path.join(PROFILE_DIR, filename)

        # 4. Define a background task to save the profile (to avoid blocking the API response)
        def save_profile_task():
            # Get the HTML output from the profiler
            profile_html = profiler.output_html()
            with open(output_path, "w") as f:
                f.write(profile_html)
            print(f"Profile saved to: {output_path}")

        # 5. Attach the saving function as a background task
        response.background = BackgroundTask(save_profile_task)

        # Optional: Add a header to the response to inform the user
        response.headers["X-Profile-Path"] = output_path
        
        return response