import { Server, Socket } from "socket.io";


export const negotiationHandler = (
  io: Server,
  socket: Socket
) => {

  socket.on(
    "join_order_room",
    ({ orderId }) => {

      socket.join(
        `order:${orderId}`
      );

      console.log(
        `${socket.user.id} joined order:${orderId}`
      );

      io.to(
        `order:${orderId}`
      ).emit(
        "user_joined_order_room",
        {
          userId: socket.user.id,
        }
      );
    }
  );

  socket.on(
    "send_bid_message",
    (data) => {

      const {
        orderId,
        text,
        price,
      } = data;

      io.to(
        `order:${orderId}`
      ).emit(
        "receive_bid_message",
        {
          senderId: socket.user.id,
          text,
          price,
          createdAt: new Date(),
        }
      );
    }
  );

  socket.on(
    "select_seller",
    ({ sellerId, orderId }) => {

      io.to(
        `user:${sellerId}`
      ).emit(
        "seller_selected",
        {
          orderId,
        }
      );

      io.to(
        `order:${orderId}`
      ).emit(
        "order_closed",
        {
          sellerId,
        }
      );
    }
  );
};



export const directChatHandler = (
  io: Server,
  socket: Socket
) => {

  
  socket.on(
    "join_conversation",
    ({ conversationId }) => {

      socket.join(
        `conversation:${conversationId}`
      );

      console.log(
        `${socket.user.id} joined conversation:${conversationId}`
      );
    }
  );


  socket.on(
    "send_private_message",
    (data) => {

      const {
        conversationId,
        text,
      } = data;

      io.to(
        `conversation:${conversationId}`
      ).emit(
        "receive_private_message",
        {
          senderId: socket.user.id,
          text,
          createdAt: new Date(),
        }
      );
    }
  );
};