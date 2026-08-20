import jwt from "jsonwebtoken";
import { Socket } from "socket.io";

interface JwtPayloadType {
  id: number;
}

export interface AuthenticatedSocket extends Socket {
  user: {
    id: number;
  };
}

export const socketAuth = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    let token = socket.handshake.auth?.token;

    if (!token) {
      const cookieHeader =
        socket.handshake.headers.cookie;

      const accessTokenCookie = cookieHeader
        ?.split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) =>
          cookie.startsWith("accessToken=")
        );

      token = accessTokenCookie?.substring(
        "accessToken=".length
      );
    }

    if (!token) {
      return next(
        new Error("Access token missing")
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as JwtPayloadType;

    if (
      !decoded ||
      typeof decoded.id !== "number"
    ) {
      return next(
        new Error("Invalid token payload")
      );
    }

    (
      socket as AuthenticatedSocket
    ).user = {
      id: decoded.id,
    };

    next();
  } catch (error: any) {
    if (error?.name === "TokenExpiredError") {
      return next(
        new Error("Access token expired")
      );
    }

    if (
      error?.name === "JsonWebTokenError"
    ) {
      return next(
        new Error("Invalid access token")
      );
    }

    console.error(
      "SOCKET_AUTH_ERROR:",
      error
    );

    return next(
      new Error("Unauthorized")
    );
  }
};