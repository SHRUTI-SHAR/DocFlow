"""
Security and Authentication Utilities
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """
    Get current user from JWT token
    
    Args:
        credentials: HTTP Bearer token credentials
    
    Returns:
        User ID if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        # TODO: Implement JWT token validation
        # For now, we'll accept any token (development mode)
        # In production, validate against Supabase auth
        
        token = credentials.credentials
        
        # Placeholder: Extract user_id from token
        # In production, decode JWT and validate:
        # from jose import jwt
        # payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        # return payload.get("sub")  # user_id
        
        # For development, accept token as user_id
        if token:
            return token
        
        return None
    
    except Exception as e:
        logger.error(f"Error validating token: {e}")
        return None


async def require_auth(
    user_id: Optional[str] = Depends(get_current_user)
) -> str:
    """
    Dependency that requires authentication
    
    Raises:
        HTTPException: If user is not authenticated
    """
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


async def optional_auth(
    user_id: Optional[str] = Depends(get_current_user)
) -> Optional[str]:
    """
    Dependency that optionally requires authentication
    
    Returns:
        User ID if authenticated, None otherwise
    """
    return user_id

