import { Socket } from "socket.io";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
  role: string;
  username:string;
}

export const socketAuth = (socket:Socket, next:any) => {
  try {
    console.log("AUTH:", socket.handshake.auth);

    const token = socket.handshake.auth.token;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    console.log("DECODED:", decoded);

    socket.user = decoded as JwtPayload;

    next();
  } catch (error) {
    console.log("JWT ERROR:", error);
    next(new Error("Unauthorized"));
  }
};