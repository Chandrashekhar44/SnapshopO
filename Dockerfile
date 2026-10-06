FROM node:22

WORKDIR /app

COPY api-gateway ./api-gateway
COPY auth-service ./auth-service
COPY messaging-service ./messaging-service
COPY notification-service ./notification-service
COPY shopping-service ./shopping-service

RUN cd /app/api-gateway && npm install
RUN cd /app/auth-service && npm install
RUN cd /app/messaging-service && npm install
RUN cd /app/notification-service && npm install
RUN cd /app/shopping-service && npm install

RUN cd /app/auth-service && npx prisma generate
RUN cd /app/messaging-service && npx prisma generate
RUN cd /app/notification-service && npx prisma generate
RUN cd /app/shopping-service && npx prisma generate

RUN cd /app/notification-service && npm run build

COPY start.sh /app/start.sh

RUN chmod +x /app/start.sh

EXPOSE 4000

CMD ["/app/start.sh"]