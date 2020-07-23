from collections import OrderedDict
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.core.paginator import EmptyPage

class JustNumbersPagination(PageNumberPagination):
    def get_paginated_response(self, data):
        fields = OrderedDict()
        try:
            fields['next'] = self.page.next_page_number()
        except EmptyPage:
            fields['next'] = None
        try:
            fields['prev'] = self.page.previous_page_number()
        except EmptyPage:
            fields['prev'] = None
        fields['count'] = self.page.paginator.count
        fields['results'] = data
        return Response(fields)
