import os
import mymiddleware
import datetime

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

SECRET_KEY = os.environ['SECRET_KEY']

DEBUG = True

ALLOWED_HOSTS = ['*']

CORS_ORIGIN_ALLOW_ALL = True

CORS_ORIGIN_WHITELIST = (
    'localhost:4200',
    'localhost:3000',
    'localhost:8000',
    '127.0.0.1:8000'
)

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.sites',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'webpack_loader',
    'corsheaders',
    'authentication',
    'schat',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'mymiddleware.activeuser_middleware.ActiveUserMiddleware',
]

ROOT_URLCONF = 'schat.urls'

WSGI_APPLICATION = 'schat.wsgi.application'

AUTH_USER_MODEL = 'authentication.Account'
SESSION_COOKIE_AGE = 60 * 60 * 24 * 365   # seconds, must be equal to user expires in front-end

USER_ONLINE_TIMEOUT = 300
USER_LASTSEEN_TIMEOUT = 60 * 60 * 24 * 7

AUTHENTICATION_BACKENDS = ['django.contrib.auth.backends.ModelBackend']

CACHES = {
    'default': {
        'BACKEND': 'redis_cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379')
    }
}

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': (
        #'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_jwt.authentication.JSONWebTokenAuthentication',
        #'rest_framework.authentication.SessionAuthentication',
        #'rest_framework.authentication.BasicAuthentication',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ),
    'DEFAULT_PAGINATION_CLASS': 'schat.paginator.JustNumbersPagination',
    'PAGE_SIZE': 30
}

JWT_AUTH = {
    'JWT_EXPIRATION_DELTA': datetime.timedelta(days=20),
    'JWT_AUTH_HEADER_PREFIX': 'Bearer',
}

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates-dev')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Database
# https://docs.djangoproject.com/en/1.7/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

# Internationalization
# https://docs.djangoproject.com/en/1.7/topics/i18n/

LANGUAGE_CODE = 'en-us'

#TIME_ZONE = 'Europe/Moscow'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.7/howto/static-files/
'''
TEMPLATE_DIRS = (
    os.path.join(BASE_DIR, 'templates'),
)
'''
STATICFILES_DIRS = (
  os.path.join(BASE_DIR, 'static'),
)
STATIC_URL = '/static/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'
DEBUGMEDIA = True

SITE_ID = 1


EMAIL_HOST = "smtp.gmail.com"
EMAIL_HOST_USER = os.environ['EMAIL_HOST_USER']
EMAIL_HOST_PASSWORD = os.environ['EMAILPASS']
EMAIL_PORT = 587
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = os.environ['DEFAULT_FROM_EMAIL']

WEBPACK_LOADER = {
    'DEFAULT': {
        'BUNDLE_DIR_NAME': '',

        'STATS_FILE': os.path.join(BASE_DIR, 'webpack-stats.json'),
    }
}

USE_WEBSOCKET = True
PUB_ENDPOINT = 'http://127.0.0.1:8000/pub'
