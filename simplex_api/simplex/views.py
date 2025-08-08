from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .solver import simplex_solve, SimplexError

class SimplexAPIView(APIView):
    def post(self, request):
        try:
            result = simplex_solve(request.data)
            return Response(result, status=status.HTTP_200_OK)
        except SimplexError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except KeyError as e:
            return Response({"error": f"Falta el campo: {e}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Error inesperado: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

