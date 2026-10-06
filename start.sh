#!/bin/sh

echo "Starting Auth Service..."
cd /app/auth-service
npm start &

echo "Starting Shopping Service..."
cd /app/shopping-service
npm start &

echo "Starting Messaging Service..."
cd /app/messaging-service
npm start &

echo "Starting Notification Service..."
cd /app/notification-service
npm start &

echo "Starting API Gateway..."
cd /app/api-gateway
npm start