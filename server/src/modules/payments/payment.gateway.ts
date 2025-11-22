import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: [
      // Use ConfigService to read CLIENT_URL with a fallback
      new ConfigService().get<string>('CLIENT_URL') || 'http://localhost:3000',
      process.env.MOBILE_URL || 'http://localhost:8082',
    ],
    credentials: true,
  },
  namespace: '/payments',
})
export class PaymentGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PaymentGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor() {
    this.logger.log('🚀 PaymentGateway initialized');
  }

  afterInit() {
    this.logger.log('✅ PaymentGateway WebSocket server initialized');
    this.logger.log(`   - Namespace: /payments`);
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId as string;

    if (userId) {
      this.connectedUsers.set(userId, client.id);
      void client.join(`user_${userId}`);
      this.logger.log(
        `User ${userId} connected to payment updates (socket: ${client.id})`,
      );
    } else {
      this.logger.warn(`Client ${client.id} connected without userId`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId as string;

    if (userId) {
      this.connectedUsers.delete(userId);
      this.logger.log(`User ${userId} disconnected from payment updates`);
    }
  }

  /**
   * Emit new payment to patient
   */
  emitNewPayment(patientId: string, payment: any) {
    try {
      if (!this.server) {
        this.logger.error('❌ Socket server not initialized yet!');
        return;
      }

      if (!patientId) {
        this.logger.error('❌ Patient ID is required to emit payment event');
        return;
      }

      const roomName = `user_${patientId}`;
      this.logger.log(`🔔 Emitting new payment to room: ${roomName}`);

      this.server.to(roomName).emit('payment:new', {
        type: 'payment:new',
        data: payment,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`✅ Payment event emitted to patient ${patientId}`);
    } catch (error) {
      this.logger.error('❌ Error emitting payment event:', error);
    }
  }

  /**
   * Emit payment update to patient
   */
  emitPaymentUpdate(patientId: string, payment: any) {
    try {
      if (!this.server) {
        this.logger.error('❌ Socket server not initialized yet!');
        return;
      }

      if (!patientId) {
        this.logger.error(
          '❌ Patient ID is required to emit payment update event',
        );
        return;
      }

      const roomName = `user_${patientId}`;
      this.logger.log(`🔔 Emitting payment update to room: ${roomName}`);

      this.server.to(roomName).emit('payment:update', {
        type: 'payment:update',
        data: payment,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`✅ Payment update emitted to patient ${patientId}`);
    } catch (error) {
      this.logger.error('❌ Error emitting payment update:', error);
    }
  }

  /**
   * Emit payment deletion to patient
   */
  emitPaymentDelete(patientId: string, paymentId: string) {
    try {
      if (!this.server) {
        this.logger.error('❌ Socket server not initialized yet!');
        return;
      }

      if (!patientId) {
        this.logger.error(
          '❌ Patient ID is required to emit payment delete event',
        );
        return;
      }

      const roomName = `user_${patientId}`;
      this.logger.log(`🔔 Emitting payment delete to room: ${roomName}`);

      this.server.to(roomName).emit('payment:delete', {
        type: 'payment:delete',
        data: { paymentId },
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`✅ Payment delete emitted to patient ${patientId}`);
    } catch (error) {
      this.logger.error('❌ Error emitting payment delete:', error);
    }
  }
}
