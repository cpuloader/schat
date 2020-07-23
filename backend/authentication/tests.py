# coding: utf-8
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from rest_framework_jwt.settings import api_settings

from .models import Account
from .views import AccountViewSet


class APIJWTClient(APIClient):
  def login(self, **credentials):
    response = self.post('/api/v1/auth/login/', credentials, format='json')
    #print(response.data.items())
    if response.status_code == status.HTTP_200_OK:
      self.credentials(
          HTTP_AUTHORIZATION="{0} {1}".format(api_settings.JWT_AUTH_HEADER_PREFIX, 
             response.data['token'])
      )
      return True
    else:
      return False


class AccountViewTest(APITestCase):
  client_class = APIJWTClient
  
  def setUp(self):
    self.raw_password = 'testpass'
    self.user = Account.objects.create(email='test1@test.com', 
         username='test1', password=self.raw_password)
    return super(AccountViewTest, self).setUp()
  
  def test_login(self):
    logged = self.client.login(email=self.user.email, password=self.raw_password)
    self.assertEqual(logged, True)

  def test_login_wrong_credentials(self):
    logged = self.client.login(email=self.user.email, password='wrong')
    self.assertEqual(logged, False)

  def test_get_accounts(self):
    self.client.login(email=self.user.email, password=self.raw_password)
    response = self.client.get('/api/v1/accounts/')
    #print(response.data[0].items())
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data[0]['id'], 1)


class AuthRegisterViewTest(APITestCase):
  client_class = APIClient
  url = '/api/v1/register/'
  
  def test_register_new_account(self):
    email = 'test2@test.com'
    username = 'test2'
    raw_password = 'testpass'
    response = self.client.post(self.url, {'email': email, 
         'username': username, 'password': raw_password}, format='json')
    self.assertEqual(response.status_code, 201)
    self.assertEqual(response.data['email'] == email, True)

  def test_register_new_account_wrong_data(self):
    email = 'test3@test.com'
    username = ''
    raw_password = 'testpass'
    response = self.client.post(self.url, {'email': email, 
         'username': username, 'password': raw_password}, format='json')
    #print(response.data.items())
    self.assertEqual(response.status_code, 400)
    self.assertEqual(response.data['username'][0] == 'This field may not be blank.', True)