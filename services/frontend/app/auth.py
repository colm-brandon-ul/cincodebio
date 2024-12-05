from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse

app = FastAPI()

@app.middleware("http")
async def redirect_to_auth(request: Request, call_next):
    # Skip redirection for specific paths like '/auth-redirect' or static files
    if request.url.path in ["/auth-redirect", "/login"]:
        return await call_next(request)
    
    # Check if the user is authenticated
    # If the user is authenticated, continue with the request, if auth token in header
    if "Authorization" in request.headers:
        return await call_next(request)
    
    # If the user is not authenticated, redirect to the authentication page



    # Redirect all other requests to /auth-redirect with the original URL as a query parameter
    target_url = f"/auth-redirect?next={request.url.path}"
    return RedirectResponse(url=target_url)

@app.get("/auth-redirect")
async def auth_redirect():
    # Serve the HTML page with JavaScript logic
    return """
    <!DOCTYPE html>
    <html>
    <head><title>Authenticating...</title></head>
    <body>
      <script src="/app/static/auth_redirect.js"></script>
    </body>
    </html>
    """