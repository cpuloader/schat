from django.contrib.auth import update_session_auth_hash
from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination

from authentication.models import Account, AvatarImage
from schat.models import Message

class AvatarImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = AvatarImage
        fields = ('author', 'picture', 'picture_for_profile', 'picture_for_preview')
        read_only_fields = ('author', 'picture_for_profile', 'picture_for_preview')

    def get_validation_exclusions(self, *args, **kwargs):
        exclusions = super(AvatarImageSerializer, self).get_validation_exclusions()
        return exclusions + ['author'] + ['picture_for_profile'] + ['picture_for_preview']

    def create(self, validated_data):
        validated_data['picture_for_profile'] = validated_data['picture']
        validated_data['picture_for_preview'] = validated_data['picture']
        instance = AvatarImage.objects.create(**validated_data)
        #print('created ', instance)
        return instance


class AccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    avatarimage = AvatarImageSerializer(read_only=True, required=False)

    class Meta:
        model = Account
        fields = ('id', 'email', 'username', 'created_at', 'updated_at',
                  'first_name', 'last_name', 'tagline', 'password',
                  'confirm_password', 'enabled', 'avatarimage',
                  'is_online')
        read_only_fields = ('created_at', 'updated_at', 'is_online')

    def update(self, instance, validated_data):
        instance.email = validated_data.get('email', instance.email).lower()
        instance.username = validated_data.get('username', instance.username)
        instance.tagline = validated_data.get('tagline', instance.tagline)

        instance.save()
        password = validated_data.get('password', None)
        confirm_password = validated_data.get('confirm_password', None)

        if password and confirm_password and password == confirm_password:
            instance.set_password(password)
            instance.save()
        # we don't use sessions here
        #update_session_auth_hash(self.context.get('request'), instance)
        return instance
