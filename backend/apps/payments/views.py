from rest_framework import views, status, response, permissions
from .models import Transaction
from .serializers import TransactionSerializer

class CreateTransactionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Logic to initialize payment with Payme/Click
        return response.Response({"message": "Payment initialized"}, status=status.HTTP_201_CREATED)

class PaymeCallbackView(views.APIView):
    def post(self, request):
        # Payme specific callback logic (Merchant API)
        return response.Response({"result": {"success": True}})

class ClickCallbackView(views.APIView):
    def post(self, request):
        # Click specific callback logic
        return response.Response({"status": 0})
