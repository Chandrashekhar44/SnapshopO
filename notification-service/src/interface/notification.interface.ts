
export interface NotificationProvider {
  send(to: string, message: string): Promise<void>;
}
