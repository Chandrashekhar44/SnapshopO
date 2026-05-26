import { Socket } from "socket.io";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
  role: string;
  username:string;
}

export const socketAuth = (
  socket: Socket,
  next: any
) => {

  try {

    const token =
      socket.handshake.auth.token;

    if (!token) {
      return next(
        new Error("Unauthorized")
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    socket.user = decoded;

    next();

  } catch (error) {

    next(
      new Error("Unauthorized")
    );

  }
};