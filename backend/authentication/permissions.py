from rest_framework import permissions


class IsAccountOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, account):
        if request.user:
            return account == request.user
        return False

class IsAuthorOfAvatar(permissions.BasePermission):
    def has_object_permission(self, request, view, image):
        #print('checking perms for image', image)
        if request.user:
            return image.author == request.user
        return False