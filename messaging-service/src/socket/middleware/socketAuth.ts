import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";

interface JwtPayload {
  id: number;
  role: string;
  username: string;
}

export const socketAuth = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const cookies = cookie.parse(
      socket.handshake.headers.cookie || ""
    );

    const token = cookies.accessToken;

    console.log("Cookies:", cookies);
    console.log("Access Token:", token);

    if (!token) {
      return next(new Error("Access token missing"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    socket.user = decoded;

    console.log("Socket authenticated:", decoded);

    next();
  } catch (error) {
    console.log("Socket JWT Error:", error);
    next(new Error("Unauthorized"));
  }
};