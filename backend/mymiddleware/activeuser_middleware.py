import datetime
from django.core.cache import cache
from django.conf import settings
from django.utils.functional import SimpleLazyObject
from django.contrib.auth.middleware import get_user
from django.contrib.auth.models import AnonymousUser
from django.utils.deprecation import MiddlewareMixin

from rest_framework.request import Request
from rest_framework.serializers import ValidationError
from rest_framework_jwt.serializers import VerifyJSONWebTokenSerializer


def get_user_jwt(request):
    token = request.META.get('HTTP_AUTHORIZATION', 'empty empty').split()[1]
    #print('token:', token)
    data = {'token': token}
    try:
        valid_data = VerifyJSONWebTokenSerializer().validate(data)
        user = valid_data['user']
        return user
    except ValidationError as v:
        #print('validation error', v)
        return AnonymousUser()

class ActiveUserMiddleware(MiddlewareMixin):

    def process_request(self, request):
        request.user = SimpleLazyObject(lambda: get_user_jwt(request))
        current_user = request.user
        if hasattr(current_user, 'username'):
            now = datetime.datetime.now()
            cache.set('seen_%s' % (current_user.username), now,
                           settings.USER_LASTSEEN_TIMEOUT)
            #print(cache.get('seen_%s' % current_user.username), current_user.username)