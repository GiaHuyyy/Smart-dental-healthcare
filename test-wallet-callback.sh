#!/bin/bash

# Test wallet callback manually
# Replace USER_ID with actual user ID from your database

USER_ID="your_user_id_here"
AMOUNT=100000

curl -X POST http://localhost:8081/api/v1/wallet/test-callback \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"amount\": $AMOUNT,
    \"orderId\": \"TEST_ORDER_$(date +%s)\"
  }"

echo ""
echo "Check your wallet balance and transaction history!"

