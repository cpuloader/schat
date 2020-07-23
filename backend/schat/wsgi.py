"""
WSGI config for schat project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.11/howto/deployment/wsgi/
"""

import os

from dotenv import load_dotenv
project_folder = os.path.expanduser('~/sites/schat')  # adjust as appropriate
load_dotenv(os.path.join(project_folder, '.env'))

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "schat.settings")

application = get_wsgi_application()
