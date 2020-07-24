import hashlib, random
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import update_session_auth_hash
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.mail import send_mail
from rest_framework import permissions, viewsets, status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.authentication import BasicAuthentication
from rest_framework_jwt.authentication import JSONWebTokenAuthentication
from rest_framework_jwt.serializers import VerifyJSONWebTokenSerializer
from rest_framework_jwt.settings import api_settings

from django.conf import settings
from authentication.models import Account, AvatarImage
from authentication.permissions import IsAccountOwner, IsAuthorOfAvatar
from authentication.serializers import AccountSerializer, AvatarImageSerializer
from schat.auth_classes import CsrfExemptSessionAuthentication
from mymiddleware.activeuser_middleware import get_user_jwt

jwt_response_payload_handler = api_settings.JWT_RESPONSE_PAYLOAD_HANDLER

class AuthRegister(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication, BasicAuthentication)
    serializer_class = AccountSerializer
    permission_classes = (permissions.AllowAny,)

    def post(self, request, format=None):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    authentication_classes = (JSONWebTokenAuthentication,)

    def paginate_queryset(self, queryset, view=None): # turn off pagination
        return None

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return (permissions.IsAuthenticated(),)

        if self.request.method == 'POST':
            return (permissions.IsAuthenticated(),)

        return (permissions.IsAuthenticated(), IsAccountOwner(),)
    
    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid(raise_exception=True):
            Account.objects.create(**serializer.validated_data)
            return Response(serializer.validated_data, status=status.HTTP_201_CREATED)

        return Response({
            'status': 'Bad request',
            'detail': 'Account could not be created with received data.'
        }, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):      # deactivating instead of deleting
        acc = Account.objects.get(pk=request.user.pk)
        acc.enabled = False
        acc.save()
        #update_session_auth_hash(request, acc)  #no need because we dont use sessions here
        return Response({
            'status': 'Deactivated',
            'detail': 'User deactivated.'
        }, status=status.HTTP_204_NO_CONTENT)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('search'):
            user = get_user_jwt(self.request)   # username = email here
            email = self.request.GET.get('search')
            queryset = Account.objects.filter(email=email).exclude(email=user)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        else:
            queryset = Account.objects.all()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
   
"""
            return Response({
            'status': 'Secret',
            'detail': 'Nobody can get all users.'
            }, status=status.HTTP_403_FORBIDDEN)
"""

class AvatarViewSet(viewsets.ModelViewSet):
    queryset = AvatarImage.objects.all()
    serializer_class = AvatarImageSerializer

    def paginate_queryset(self, queryset, view=None): # turn off pagination
        return None

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return (permissions.AllowAny(),)
        #print(self.request.data)
        return (permissions.IsAuthenticated(), IsAuthorOfAvatar(),)

    def perform_create(self, serializer):
        parent = Account.objects.get(pk=self.request.user.id)
        if hasattr(parent, 'avatarimage'):
            #old_ava = parent.avatarimage.get()
            #old_ava.delete()
            parent.avatarimage.delete()
            #print('old avatar deleted!')
        serializer.save(author=self.request.user)


class CookieJSONWebTokenAPIView(APIView):
    permission_classes = ()
    authentication_classes = ()
    serializer_class = VerifyJSONWebTokenSerializer

    def get_serializer_context(self):
        return {
            'request': self.request,
            'view': self,
        }

    def get_serializer_class(self):
        assert self.serializer_class is not None, (
            "'%s' should either include a `serializer_class` attribute, "
            "or override the `get_serializer_class()` method."
            % self.__class__.__name__)
        return self.serializer_class

    def get_serializer(self, *args, **kwargs):
        """
        Return the serializer instance that should be used for validating and
        deserializing input, and for serializing output.
        """
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        return serializer_class(*args, **kwargs)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            user = serializer.object.get('user') or request.user
            token = serializer.object.get('token')
            response_data = jwt_response_payload_handler(token, user, request)
            response = Response(response_data)
            if api_settings.JWT_AUTH_COOKIE:
                expiration = (datetime.utcnow() +
                              api_settings.JWT_EXPIRATION_DELTA)
                response.set_cookie(api_settings.JWT_AUTH_COOKIE,
                                    token,
                                    expires=expiration,
                                    httponly=True)
            return response

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
