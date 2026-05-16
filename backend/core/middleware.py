import logging
import time

class APILoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger('api_logger')

    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        duration = time.time() - start_time
        
        log_data = {
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration': f"{duration:.2f}s",
            'user': request.user.username if request.user.is_authenticated else 'Anonymous'
        }
        
        if response.status_code >= 400:
            self.logger.error(f"API Error: {log_data}")
        else:
            self.logger.info(f"API Request: {log_data}")
            
        return response
