from __future__ import unicode_literals
import json
import requests

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

    def save(self, *args, **kwargs):
        created = self.message is not None
        super(Message, self).save(*args, **kwargs)
        if settings.USE_WEBSOCKET:
            send_to_receivers(self, created)


def send_to_receivers(message, created):
    room = message.room
    receivers = room.members.all()
    s = requests.Session()
    if created:
        for receiver in receivers:
            if receiver.pk != message.author.pk:
                url = "{0}/{1}".format(PUB_ENDPOINT, receiver.pk)
                #print('created - signal to ', receiver.pk, url);
                s.post(url, json=json.dumps(message.as_dict()))
    if not created:
        url = "{0}/{1}".format(PUB_ENDPOINT, receiver.pk)
        #print('signal to ', message.author.pk, url);
        s.post(url, json=json.dumps(message.as_dict()))
