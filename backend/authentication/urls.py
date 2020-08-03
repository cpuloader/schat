from django.conf.urls import url
from .views import LoginView, LogoutView, UserSessionVerifyAPIView

urlpatterns = [
    url(r'^login/', LoginView.as_view()),
    url(r'^logout/', LogoutView.as_view()),
    url(r'^auth-verify/', UserSessionVerifyAPIView.as_view()),
]