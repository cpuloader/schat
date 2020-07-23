from django.conf.urls import include, url
from django.conf import settings
from django.contrib import admin
from django.views.generic import TemplateView
from django.views.decorators.cache import cache_control
from rest_framework_nested import routers

if settings.DEBUG:
    from django.conf.urls.static import static

from .views import index, MessagesViewSet, RoomsViewSet, RoomMessagesViewSet
from authentication.views import AuthRegister, AccountViewSet, AvatarViewSet

router = routers.SimpleRouter()
router.register(r'accounts', AccountViewSet)
router.register(r'avatars', AvatarViewSet)
router.register(r'messages', MessagesViewSet)
router.register(r'rooms', RoomsViewSet)

rooms_router = routers.NestedSimpleRouter( #router for getting messages in room view
    router, r'rooms', lookup='room'
)
rooms_router.register(r'messages', RoomMessagesViewSet)


urlpatterns = [
    url(r'^api/v1/', include(router.urls)),
    url(r'^api/v1/auth/', include('authentication.urls')),
    url(r'^api/v1/register', AuthRegister.as_view()),
    url(r'^api/v1/', include(rooms_router.urls)),

    #url(r'^$',  cache_control(max_age=2592000)(index), name='index'),
    #url(r'^ngsw-worker.js', cache_control(max_age=2592000)(TemplateView.as_view(template_name="ngsw-worker.js", content_type='application/javascript', )), name='ngsw-worker.js'),
    #url(r'^ngsw.json', cache_control(max_age=2592000)(TemplateView.as_view(template_name="ngsw.json", content_type='application/json', )), name='ngsw.json'),
    url(r'^$',  index, name='index.html'),
    url(r'^ngsw-worker', TemplateView.as_view(template_name="ngsw-worker.js", 
                content_type='application/javascript', ), name='ngsw-worker.js'),
    url(r'^ngsw.json', TemplateView.as_view(template_name="ngsw.json", 
                content_type='application/json', ), name='ngsw.json'),
    url(r'^admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)