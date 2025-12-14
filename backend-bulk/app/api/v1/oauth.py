"""
OAuth endpoints for Google Drive and OneDrive authentication
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, HTMLResponse
import os
import json
from typing import Optional

router = APIRouter()

# These should be in environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET")
MICROSOFT_TENANT_ID = os.getenv("MICROSOFT_TENANT_ID", "common")


@router.get("/oauth/google-drive/authorize")
async def google_drive_authorize(redirect_uri: str):
    """Initiate Google Drive OAuth flow"""
    try:
        from google_auth_oauthlib.flow import Flow
        
        # Create flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=['https://www.googleapis.com/auth/drive.readonly'],
            redirect_uri=redirect_uri
        )
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        # Store state in session (in production, use Redis or database)
        # For now, we'll pass it in the URL
        
        return RedirectResponse(url=authorization_url)
        
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth dependencies not installed. Run: pip install google-auth-oauthlib"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oauth/google-drive/callback")
async def google_drive_callback(request: Request, code: str, state: Optional[str] = None):
    """Handle Google Drive OAuth callback"""
    try:
        from google_auth_oauthlib.flow import Flow
        from google.oauth2.credentials import Credentials
        
        # Recreate flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=['https://www.googleapis.com/auth/drive.readonly'],
            redirect_uri=str(request.url).split('?')[0]
        )
        
        # Exchange code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Save token to file
        tokens_dir = "tokens"
        os.makedirs(tokens_dir, exist_ok=True)
        
        token_file = f"{tokens_dir}/google_drive_token_{os.urandom(8).hex()}.json"
        token_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        with open(token_file, 'w') as f:
            json.dump(token_data, f)
        
        # Return HTML that sends message to parent window
        html_content = f"""
        <html>
            <body>
                <script>
                    window.opener.postMessage({{
                        type: 'oauth-success',
                        provider: 'google_drive',
                        tokenPath: '{token_file}'
                    }}, '*');
                    window.close();
                </script>
                <p>Authentication successful! You can close this window.</p>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        html_content = f"""
        <html>
            <body>
                <script>
                    window.opener.postMessage({{
                        type: 'oauth-error',
                        provider: 'google_drive',
                        error: '{str(e)}'
                    }}, '*');
                    window.close();
                </script>
                <p>Authentication failed: {str(e)}</p>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=400)


@router.get("/oauth/onedrive/authorize")
async def onedrive_authorize(redirect_uri: str):
    """Initiate OneDrive OAuth flow"""
    try:
        import msal
        
        # Create MSAL app
        app = msal.PublicClientApplication(
            MICROSOFT_CLIENT_ID,
            authority=f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}"
        )
        
        # Get authorization URL
        auth_url = app.get_authorization_request_url(
            scopes=["Files.Read.All"],
            redirect_uri=redirect_uri
        )
        
        return RedirectResponse(url=auth_url)
        
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="MSAL not installed. Run: pip install msal"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oauth/onedrive/callback")
async def onedrive_callback(request: Request, code: str):
    """Handle OneDrive OAuth callback"""
    try:
        import msal
        
        # Create MSAL app
        app = msal.PublicClientApplication(
            MICROSOFT_CLIENT_ID,
            authority=f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}"
        )
        
        # Exchange code for token
        result = app.acquire_token_by_authorization_code(
            code,
            scopes=["Files.Read.All"],
            redirect_uri=str(request.url).split('?')[0]
        )
        
        if "access_token" in result:
            # Save token to file
            tokens_dir = "tokens"
            os.makedirs(tokens_dir, exist_ok=True)
            
            token_file = f"{tokens_dir}/onedrive_token_{os.urandom(8).hex()}.json"
            
            with open(token_file, 'w') as f:
                json.dump(result, f)
            
            # Return HTML that sends message to parent window
            html_content = f"""
            <html>
                <body>
                    <script>
                        window.opener.postMessage({{
                            type: 'oauth-success',
                            provider: 'onedrive',
                            tokenPath: '{token_file}',
                            clientId: '{MICROSOFT_CLIENT_ID}',
                            tenantId: '{MICROSOFT_TENANT_ID}'
                        }}, '*');
                        window.close();
                    </script>
                    <p>Authentication successful! You can close this window.</p>
                </body>
            </html>
            """
            return HTMLResponse(content=html_content)
        else:
            error_msg = result.get("error_description", "Unknown error")
            raise Exception(error_msg)
            
    except Exception as e:
        html_content = f"""
        <html>
            <body>
                <script>
                    window.opener.postMessage({{
                        type: 'oauth-error',
                        provider: 'onedrive',
                        error: '{str(e)}'
                    }}, '*');
                    window.close();
                </script>
                <p>Authentication failed: {str(e)}</p>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=400)
