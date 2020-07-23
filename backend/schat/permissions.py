from rest_framework import permissions


class IsMemberOfRoom(permissions.BasePermission):
    def has_object_permission(self, request, view, room):
        if request.user:
            return request.user in room.members.all()
        return False

class IsAuthorOfMessage(permissions.BasePermission):
    def has_object_permission(self, request, view, message):
        if request.user:
            return message.author == request.user
        return False

class IsMemberOfMessageRoom(permissions.BasePermission):
    def has_object_permission(self, request, view, message):
        if request.user:
            return request.user in message.room.members.all()
        return False