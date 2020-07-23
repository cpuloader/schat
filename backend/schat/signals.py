from django.db.models.signals import post_save
from django.dispatch import receiver

import json
import requests
#from channels import Group
from .models import Message, Room

PUB_ENDPOINT = 'http://localhost:80/pub'

@receiver(post_save, sender=Message)
def new_message_handler(**kwargs):
    message = kwargs['instance']
    room = message.room
    receivers = room.members.all()
    s = requests.Session()
    if kwargs['created']:
        for receiver in receivers:
            if receiver.pk!= message.author.pk:
                #print('created - signal to ', receiver.pk);
                #Group('chat-' + str(receiver.pk)).send({'text': json.dumps(message.as_dict())})
                s.post(PUB_ENDPOINT, params={'id': receiver.pk}, 
                       json=json.dumps(message.as_dict()))
    if not kwargs['created']:
        #Group('chat-' + str(message.author.pk)).send({'text': json.dumps(message.as_dict())})
        #print('signal to ', message.author.pk);
        s.post(PUB_ENDPOINT, params={'id': message.author.pk}, 
                       json=json.dumps(message.as_dict()))