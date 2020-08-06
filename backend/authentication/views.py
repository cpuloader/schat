import hashlib, random
import jwt
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.middleware import get_user
from rest_framework import permissions, viewsets, status, exceptions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import BasicAuthentication, SessionAuthentication, get_authorization_header

from django.conf import settings
from authentication.models import Account, AvatarImage
from authentication.permissions import IsAccountOwner, IsAuthorOfAvatar
from authentication.serializers import AccountSerializer, AvatarImageSerializer
from schat.auth_classes import CsrfExemptSessionAuthentication


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
    authentication_classes = (SessionAuthentication,)

    def paginate_queryset(self, queryset, view=None): # turn off pagination
        return None

    def get_permissions(self):
        if self.request.method == 'GET': # user can't get random users, only search by email
            return (permissions.IsAuthenticated(), IsAccountOwner(),)

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

    def destroy(self, request, *args, **kwargs):
        acc_pk = int(self.kwargs['pk'])
        if request.user.pk == acc_pk:
            acc = Account.objects.get(pk=acc_pk)
            acc.delete()
        else:
            user = Account.objects.get(pk=request.user.pk)
            if user.is_admin:
                acc = Account.objects.get(pk=acc_pk)
                acc.delete()
            else:
                return Response({}, status=status.HTTP_403_FORBIDDEN)
        return Response({}, status=status.HTTP_204_NO_CONTENT)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('search'):
            user = get_user(self.request)   # username = email here
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
    authentication_classes = (SessionAuthentication,)

    def paginate_queryset(self, queryset, view=None): # turn off pagination
        return None

    def get_permissions(self):
        if self.request.method == 'GET':
            return (permissions.IsAuthenticated(), IsAuthorOfAvatar(),)
        if self.request.method in permissions.SAFE_METHODS:
            return (permissions.IsAuthenticated(),)
        return (permissions.IsAuthenticated(), IsAuthorOfAvatar(),)

    def perform_create(self, serializer):
        parent = Account.objects.get(pk=self.request.user.id)
        if hasattr(parent, 'avatarimage'):
            parent.avatarimage.delete()
        serializer.save(author=self.request.user)


class LoginView(APIView):
    def post(self, request, format=None):
        email = request.data.get('email', None)
        password = request.data.get('password', None)
        account = authenticate(email=email, password=password)

        if account is not None:
            if account.enabled:
                login(request, account)
                serialized = AccountSerializer(account)
                return Response(serialized.data)
            else:
                return Response({
                    'status': 'Unauthorized',
                    'detail': 'This account has been disabled.'
                }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({
                'status': 'Unauthorized',
                'detail': 'Username/password combination invalid.'
            }, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, format=None):
        logout(request)
        return Response({}, status=status.HTTP_204_NO_CONTENT)


class UserSessionVerifyAPIView(APIView):
    permission_classes = ()
    authentication_classes = (SessionAuthentication,)

    def get(self, request, *args, **kwargs):
        user = get_user(request)

        if authenticate_user_credentials(user):
            return Response({}, status=status.HTTP_200_OK)

        return Response({}, status=status.HTTP_403_FORBIDDEN)



def authenticate_user_credentials(username):
    User = get_user_model()

    if not username:
        raise exceptions.AuthenticationFailed('Invalid payload.')

    try:
        user = User.objects.get_by_natural_key(username)
    except User.DoesNotExist:
        raise exceptions.AuthenticationFailed('Invalid signature.')

    if not user.is_active or not user.enabled:
        raise exceptions.AuthenticationFailed('User account is disabled.')

    return True
