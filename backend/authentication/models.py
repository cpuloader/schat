from __future__ import unicode_literals
import os
import datetime
from django.core.cache import cache
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.core import validators
from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .utils import resize_picture

class AccountManager(BaseUserManager):
    def create(self, email, password=None, **kwargs):
        if not email:
            raise ValueError('Users must have a valid email address.')

        if not kwargs.get('username'):
            raise ValueError('Users must have a valid username.')

        account = self.model(
            email=self.normalize_email(email), username=kwargs.get('username'),
            tagline=kwargs.get('tagline', '')
        )
        
        account.set_password(password)
        account.save()
        return account

    def create_superuser(self, email, password, **kwargs):
        account = self.create(email, password, **kwargs)

        account.is_admin = True
        account.save()

        return account


class Account(AbstractBaseUser):
    email = models.EmailField(max_length=40, unique=True)
    username = models.CharField(max_length=20, unique=True,
      validators=[
            validators.RegexValidator(r'^[\w.@+-]+$', 'Enter a valid username.', 'invalid')
        ])
    first_name = models.CharField(max_length=40, blank=True)
    last_name = models.CharField(max_length=40, blank=True)
    tagline = models.CharField(max_length=140, blank=True)
    is_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    enabled = models.BooleanField(default=True, verbose_name='Enabled')

    objects = AccountManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __unicode__(self):
        return self.email

    def get_full_name(self):
        return ' '.join([self.first_name, self.last_name])

    def get_short_name(self):
        return self.first_name

    def has_perm(self, perm, obj=None):
        #"Does the user have a specific permission?"
        # Simplest possible answer: Yes, always
        return True

    def has_module_perms(self, app_label):
        #"Does the user have permissions to view the app `app_label`?"
        # Simplest possible answer: Yes, always
        return True

    @property
    def is_staff(self):
        #"Is the user a member of staff?"
        # Simplest possible answer: All admins are staff
        return self.is_admin


    def last_seen(self):
        return cache.get('seen_%s' % self.username)

    def is_online(self):
        if self.last_seen():
            now = datetime.datetime.now()
            if now > self.last_seen() + datetime.timedelta(
                         seconds=settings.USER_ONLINE_TIMEOUT):
                return False
            else:
                return True
        else:
            return False

    def as_dict(self):
        return {'email': self.email, 
                'username': self.username, 
                'id': self.pk,
                'tagline': self.tagline,
                'is_online' : self.is_online()
                #'picture' : something
               }

class AvatarImage(models.Model):
    author = models.OneToOneField(Account, on_delete=models.CASCADE, primary_key=True)
    picture = models.ImageField(upload_to='avatar_pics', blank=True)
    picture_for_profile = models.ImageField(upload_to='avatar_pics/profile', blank=True)
    picture_for_preview = models.ImageField(upload_to='avatar_pics/preview', blank=True)

    def __unicode__(self):
        return self.picture.name

    def save(self, *args, **kwargs):
        super(AvatarImage, self).save(*args, **kwargs)
        resize_picture(self.picture_for_profile, 500)
        resize_picture(self.picture_for_preview, 100)

@receiver(post_delete, sender=AvatarImage)
def image_post_delete_handler(sender, **kwargs):
    image = kwargs['instance']
    storage, path = image.picture.storage, image.picture.path
    storage.delete(path)
    try:
        storage_for_profile, path_for_profile = image.picture_for_profile.storage, image.picture_for_profile.path
        storage_for_preview, path_for_preview = image.picture_for_preview.storage, image.picture_for_preview.path
    except ValueError as err:
        print(err)
        return
    storage_for_profile.delete(path_for_profile)
    storage_for_preview.delete(path_for_preview)
