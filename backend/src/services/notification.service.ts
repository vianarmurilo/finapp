export interface NotificationPayload {
  title: string;
  body: string;
  userId: string;
  data?: Record<string, string>;
}

export class NotificationService {
  async send(_payload: NotificationPayload): Promise<void> {
    // Estrutura pronta para integrar Firebase Cloud Messaging no futuro.
    return Promise.resolve();
  }
}
