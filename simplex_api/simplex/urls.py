from django.urls import path
from .views import SimplexAPIView

urlpatterns = [
    path('resolver/', SimplexAPIView.as_view(), name='resolver_simplex'),
]
