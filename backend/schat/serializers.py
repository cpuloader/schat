from rest_framework import serializers, status
from rest_framework.response import Response
#from rest_framework.pagination import PageNumberPagination

from authentication.serializers import AccountSerializer
from authentication.models import Account
from schat.models import Room, Message

class RoomSerializer(serializers.ModelSerializer):
    members = AccountSerializer(many=True, read_only=True, required=False)
    messages = serializers.PrimaryKeyRelatedField(many=True, read_only=True, allow_null=True)

    class Meta:
        model = Room
        fields = ('id', 'name', 'label', 'members', 'messages')
        read_only_fields = ('id', 'name', 'label')


class MessageSerializer(serializers.ModelSerializer):
    author = AccountSerializer(read_only=True, required=False)
    message = serializers.CharField(required=False)

    class Meta:
        model = Message
        fields = ('id', 'room', 'message', 'timestamp', 'author', 'checked', 'encrypted')
        read_only_fields = ('id',)

    def create(self, validated_data): # update parent room's last message time for sorting
        instance = super(MessageSerializer, self).create(validated_data)
        instance.room.update_last_msg_time(instance.timestamp)
        return instance