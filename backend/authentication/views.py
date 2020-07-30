import hashlib, random
import jwt
from django.contrib.auth import get_user_model
from rest_framework import permissions, viewsets, status, exceptions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import BasicAuthentication, get_authorization_header
from rest_framework_jwt.authentication import JSONWebTokenAuthentication
from rest_framework_jwt.utils import jwt_decode_handler

from django.conf import settings
from authentication.models import Account, AvatarImage
from authentication.permissions import IsAccountOwner, IsAuthorOfAvatar
from authentication.serializers import AccountSerializer, AvatarImageSerializer
from schat.auth_classes import CsrfExemptSessionAuthentication
from mymiddleware.activeuser_middleware import get_user_jwt


class AuthRegister(APIView):
    authentication_classes = ()#CsrfExemptSessionAuthentication, BasicAuthentication)
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

    def destroy(self, request, *args, **kwargs):      # real delete
        acc = Account.objects.get(pk=request.user.pk)
        acc.delete()
        return Response({}, status=status.HTTP_204_NO_CONTENT)
        #acc.enabled = False # deactivating
        #acc.save()
        #update_session_auth_hash(request, acc)  #no need because we dont use sessions here
        #return Response({
        #    'status': 'Deactivated',
        #    'detail': 'User deactivated.'
        #}, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('search'):
            user = get_user_jwt(self.request)   # username = email here
            email = self.request.GET.get('search')
            queryset = Account.objects.filter(email=email).exclude(email=user)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        else:
            #queryset = Account.objects.all()
            #serializer = self.get_serializer(queryset, many=True)
            #return Response(serializer.data)
            return Response({
                'status': 'Secret',
                'detail': 'Nobody can get all users.'
            }, status=status.HTTP_403_FORBIDDEN)


class AvatarViewSet(viewsets.ModelViewSet):
    queryset = AvatarImage.objects.all()
    serializer_class = AvatarImageSerializer

    def paginate_queryset(self, queryset, view=None): # turn off pagination
        return None

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return (permissions.AllowAny(),)
        return (permissions.IsAuthenticated(), IsAuthorOfAvatar(),)

    def perform_create(self, serializer):
        parent = Account.objects.get(pk=self.request.user.id)
        if hasattr(parent, 'avatarimage'):
            parent.avatarimage.delete()
        serializer.save(author=self.request.user)


class CookieJSONWebTokenAPIView(APIView):
    permission_classes = ()
    authentication_classes = ()

    def get(self, request, *args, **kwargs):
        cookie = request.COOKIES.get('Authorization')
        if authenticate_token(cookie):
            return Response({}, status=status.HTTP_200_OK)

        return Response({}, status=status.HTTP_403_FORBIDDEN)


def authenticate_token(token):
    try:
        decoded = jwt_decode_handler(token)
    except jwt.ExpiredSignature:
        raise exceptions.AuthenticationFailed('Signature has expired.')
    except jwt.DecodeError:
        raise exceptions.AuthenticationFailed('Error decoding signature.')
    except jwt.InvalidTokenError:
        raise exceptions.AuthenticationFailed()
    #print('decoded', decoded)
    username = decoded['email']
    authenticate_token_credentials(username)

    return True

def authenticate_token_credentials(username):
    User = get_user_model()

    if not username:
        raise exceptions.AuthenticationFailed('Invalid payload.')

    try:
        user = User.objects.get_by_natural_key(username)
    except User.DoesNotExist:
        raise exceptions.AuthenticationFailed('Invalid signature.')

    if not user.is_active or not user.enabled:
        raise exceptions.AuthenticationFailed('User account is disabled.')
