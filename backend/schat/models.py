from __future__ import unicode_literals

from django.db import models
from django.utils import timezone
from django.conf import settings

from authentication.models import Account


class Room(models.Model):
    name = models.TextField()
    label = models.SlugField(unique=True)
    members = models.ManyToManyField(Account, related_name='rooms')
    last_msg_time = models.DateTimeField(default=timezone.now, db_index=True)

    def __unicode__(self):
        return self.label

    def update_last_msg_time(self, time):
        #print('update room! ' + time.isoformat())
        self.last_msg_time = time
        self.save()

class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
    message = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    author = models.ForeignKey(Account, on_delete=models.PROTECT)
    checked = models.BooleanField(default=False)
    encrypted = models.BooleanField(default=False)

    def __unicode__(self):
        return '[{timestamp}] {author}: {message}'.format(**self.as_dict())

    def as_dict(self):
        return {'room': self.room.pk,
                'message': self.message,
                'timestamp': self.timestamp.isoformat(),
                'id': self.pk,
                'author': self.author.as_dict(),
                'checked': self.checked,
                'encrypted': self.encrypted
               }
