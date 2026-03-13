from django.http import HttpResponse


class SimpleCORSMiddleware:
    """A minimal CORS middleware to handle OPTIONS preflight and add CORS headers.

    This avoids adding external dependencies while enabling local frontend dev.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Short-circuit OPTIONS preflight requests
        if request.method == 'OPTIONS':
            response = HttpResponse()
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            return response

        response = self.get_response(request)
        # Ensure simple CORS header on all responses for dev convenience
        response.setdefault('Access-Control-Allow-Origin', '*')
        return response
