import "socket.io";

declare module "socket.io" {
  interface Socket {
    user: {
      id: number;
      role: string;
      username: string;
    };
  }
}