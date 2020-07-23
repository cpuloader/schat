import random
import string
import datetime

from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Q, Max
from django.shortcuts import render, redirect
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from rest_framework import permissions, viewsets, status
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework_jwt.authentication import JSONWebTokenAuthentication
from rest_framework.pagination import LimitOffsetPagination

from haikunator import Haikunator

from .models import Room, Message
from .serializers import RoomSerializer, MessageSerializer
from .permissions import IsMemberOfRoom, IsAuthorOfMessage, IsMemberOfMessageRoom
from authentication.models import Account
from mymiddleware.activeuser_middleware import get_user_jwt

if settings.DEBUG:
    import time, random                         # for debug

haikunator = Haikunator()

def index(request):
    return render(request, "index.html", {})

class MessagesViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.order_by('-timestamp')
    serializer_class = MessageSerializer
    authentication_classes = (JSONWebTokenAuthentication,)

    def paginate_queryset(self, queryset, view=None): # turn off pagination
        return None

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return (permissions.IsAuthenticated(), IsMemberOfMessageRoom(),)
        return (permissions.IsAuthenticated(), IsMemberOfMessageRoom(),)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        instance = serializer.save(author_id=self.request.user.id)
        return super(MessagesViewSet, self).perform_create(serializer)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('unread'):
            user = get_user_jwt(self.request)   # username = email here
            #print("user: ", user)
            if not user:
                return Response()
            else:
                queryset = Message.objects.filter(checked=False, room__members=user).exclude(author__id=user.pk)
        else:
            queryset = Message.objects.filter(room__members=user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class RoomsViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    authentication_classes = (JSONWebTokenAuthentication,)

    def paginate_queryset(self, queryset, view=None): # turn off pagination
        return None

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return (permissions.IsAuthenticated(), )
        return (permissions.IsAuthenticated(), IsMemberOfRoom(),)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member1_pk = self.request.data['members'][0]['id']
        member2_pk = self.request.data['members'][1]['id']
        new_chat = Room.objects.create(label=haikunator.haikunate())
        new_chat.members.set([member1_pk, member2_pk])
        serializer = self.get_serializer(new_chat)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def retrieve(self, request, *args, **kwargs):
        user1 = get_user_jwt(self.request)
        user2_id = self.kwargs['pk'] # it's user's pk really
        instance = Room.objects.filter(members=user1).filter(members__id=user2_id).first()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        user = get_user_jwt(self.request)   # username = email here
        queryset = Room.objects.filter(members=user).order_by('-last_msg_time')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class RoomMessagesViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.select_related('room').order_by('-timestamp')
    serializer_class = MessageSerializer
    authentication_classes = (JSONWebTokenAuthentication,)

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return (permissions.IsAuthenticated(), IsMemberOfMessageRoom(),) # only for room members
        return (permissions.IsAuthenticated(), IsMemberOfMessageRoom(),) 
    
    def get_queryset(self):
        if self.request.GET.get('unread'):
            last_received = int(self.request.GET['last_received']) # convert str to int
            last_received = datetime.datetime.fromtimestamp(last_received / 1000, timezone.utc)
            unread = map(int, self.request.GET['unread'].split(',')) # str list convert to int
            queryset = self.queryset.filter(Q(room__id=self.kwargs['room_pk'], timestamp__range=(last_received, timezone.now()))|Q(id__in=unread)|Q(room__id=self.kwargs['room_pk'], checked=False))
        elif self.request.GET.get('last_received'):
            last_received = int(self.request.GET['last_received']) # convert str to int
            last_received = datetime.datetime.fromtimestamp(last_received / 1000, timezone.utc)
            queryset = self.queryset.filter(Q(room__id=self.kwargs['room_pk'], timestamp__range=(last_received, timezone.now()))|Q(room__id=self.kwargs['room_pk'], checked=False))
        else:
            queryset = self.queryset.filter(room__id=self.kwargs['room_pk'])
        if settings.DEBUG:
            time.sleep(random.random()*2)          # for debug
        return queryset