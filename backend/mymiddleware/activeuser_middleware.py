import datetime
from django.core.cache import cache
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.middleware import get_user
from django.utils.functional import SimpleLazyObject

class ActiveUserMiddleware(MiddlewareMixin):

    def process_request(self, request):
        current_user = SimpleLazyObject(lambda: get_user(request))
        if current_user and current_user.is_authenticated:
            now = datetime.datetime.now()
            cache.set('seen_%s' % (current_user.username), now, 
                           settings.USER_LASTSEEN_TIMEOUT)