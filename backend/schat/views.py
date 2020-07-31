import random
import string
import datetime
import json
import requests

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

        # send to websocket
        send_message_to_endpoint(serializer.data)

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

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        # send to websocket
        update_message_to_endpoint(instance)

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

    def destroy(self, request, *args, **kwargs):
        user1_email = get_user_jwt(self.request)
        user2_email = self.request.GET.get('delete')
        if user1_email and user2_email and user1_email != user2_email:
            instances = list(Room.objects.annotate(members_count=Count('members')) \
                          .filter(members_count=2).filter(members__email=user1_email) \
                          .filter(members__email=user2_email))
            deleted = []
            for instance in instances:
                deleted.append({
                    'id': instance.id,
                    'label': instance.label
                })
                instance.delete()

            return Response({'deleted': deleted}, status=status.HTTP_200_OK)
        return Response({
            'status': 'Error',
            'detail': 'No room param.'
        }, status=status.HTTP_403_FORBIDDEN)

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


def send_message_to_endpoint(data):
    message = Message.objects.get(pk=data['id'])
    room = message.room
    author = data['author']['id']
    receivers = room.members.all()
    s = requests.Session()
    for receiver in receivers:
        if receiver.pk != author:
            url = "{0}/{1}".format(settings.PUB_ENDPOINT, receiver.pk)
            #print('created - pub to', receiver.pk, url);
            s.post(url, data=json.dumps(message.as_dict()))

def update_message_to_endpoint(message):
    room = message.room
    receivers = room.members.all()
    s = requests.Session()
    url = "{0}/{1}".format(settings.PUB_ENDPOINT, message.author.pk)
    #print('pub to', message.author.pk, url);
    s.post(url, data=json.dumps(message.as_dict()))
