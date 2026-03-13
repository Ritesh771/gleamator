import jwt
from django.conf import settings
from datetime import datetime, timedelta
from functools import wraps
from django.http import JsonResponse

from .models import User
from .models import RefreshToken
import uuid
from django.utils import timezone

JWT_ALGORITHM = 'HS256'

def generate_jwt(user):
    # access token (short-lived)
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'type': 'access',
        'exp': datetime.utcnow() + timedelta(minutes=30)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token


def generate_refresh_token(user):
    # create a refresh token, persisted for rotation
    jti = str(uuid.uuid4())
    expires = timezone.now() + timedelta(days=7)
    RefreshToken.objects.create(jti=jti, user=user, expires_at=expires)
    payload = {
        'user_id': user.id,
        'jti': jti,
        'type': 'refresh',
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token

def decode_jwt(token):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None


def _json(data, status=200):
    return JsonResponse(data, safe=False, status=status)


def require_auth(allowed=None):
    """Decorator: decode JWT, attach `request.request_user` and `request.user_payload`.
    `allowed` is a list of allowed role strings or None to allow any authenticated user.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped(request, *args, **kwargs):
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header.startswith('Bearer '):
                return _json({'error': 'authentication required'}, status=401)
            token = auth_header.split(' ', 1)[1]
            payload = decode_jwt(token)
            if not payload:
                return _json({'error': 'invalid or expired token'}, status=401)
            try:
                user = User.objects.get(id=payload.get('user_id'))
            except User.DoesNotExist:
                return _json({'error': 'user not found'}, status=401)
            request.user_payload = payload
            request.request_user = user
            if allowed and payload.get('role') not in allowed:
                return _json({'error': 'forbidden'}, status=403)
            return view_func(request, *args, **kwargs)
        return _wrapped
    return decorator
