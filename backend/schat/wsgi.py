"""
WSGI config for schat project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.11/howto/deployment/wsgi/
"""

import os

from dotenv import load_dotenv
from django.core.wsgi import get_wsgi_application

project_folder = os.path.expanduser('~/sites/schat/backend')
load_dotenv(os.path.join(project_folder, '.env'))

PROD = os.getenv('SCHAT_PRODUCTION')

if PROD == 'prod':
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pr-settings.settings-prod")
else:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pr-settings.settings-dev")
    print('running in dev mode')

application = get_wsgi_application()
