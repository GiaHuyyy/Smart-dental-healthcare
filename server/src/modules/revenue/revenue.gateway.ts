import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.MOBILE_URL || 'http://localhost:8082',
    ],
    credentials: true,
  },
  namespace: '/revenue',
})
export class RevenueGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RevenueGateway.name);
  private connectedDoctors = new Map<string, string>(); // doctorId -> socketId

  constructor() {
    this.logger.log('🚀 RevenueGateway initialized');
  }

  afterInit(server: Server) {
    this.logger.log('✅ RevenueGateway WebSocket server initialized');
    this.logger.log(`   - Namespace: /revenue`);
  }

  handleConnection(client: Socket) {
    const doctorId = client.handshake.auth?.doctorId;

    if (doctorId) {
      this.connectedDoctors.set(doctorId, client.id);
      const roomName = `doctor_${doctorId}`;
      client.join(roomName);
      this.logger.log(
        `✅ Doctor ${doctorId} connected to revenue updates (socket: ${client.id})`,
      );
      this.logger.log(`   - Joined room: ${roomName}`);
      this.logger.log(
        `   - Total doctors connected: ${this.connectedDoctors.size}`,
      );
    } else {
      this.logger.warn(`⚠️ Client ${client.id} connected without doctorId`);
    }
  }

  handleDisconnect(client: Socket) {
    const doctorId = client.handshake.auth?.doctorId;

    if (doctorId) {
      this.connectedDoctors.delete(doctorId);
      this.logger.log(`Doctor ${doctorId} disconnected from revenue updates`);
    }
  }

  /**
   * Emit new revenue to doctor
   */
  emitNewRevenue(doctorId: string, revenue: any) {
    try {
      if (!this.server) {
        this.logger.error('❌ Socket server not initialized yet!');
        return;
      }

      if (!doctorId) {
        this.logger.error('❌ Doctor ID is required to emit revenue event');
        return;
      }

      const roomName = `doctor_${doctorId}`;
      this.logger.log(`🔔 Emitting revenue:new to room: ${roomName}`);
      this.logger.log(`   - Revenue ID: ${revenue._id}`);
      this.logger.log(`   - Amount: ${revenue.amount}`);
      this.logger.log(
        `   - Connected doctors: ${Array.from(this.connectedDoctors.keys()).join(', ')}`,
      );
      this.logger.log(
        `   - Doctor ${doctorId} connected: ${this.connectedDoctors.has(doctorId)}`,
      );

      this.server.to(roomName).emit('revenue:new', {
        revenue,
        timestamp: new Date(),
      });

      this.logger.log(
        `✅ Emitted new revenue to doctor ${doctorId}: ${revenue._id}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to emit revenue to doctor ${doctorId}:`,
        error,
      );
    }
  }

  /**
   * Emit revenue update to doctor
   */
  emitRevenueUpdate(doctorId: string, revenue: any) {
    try {
      this.server.to(`doctor_${doctorId}`).emit('revenue:updated', {
        revenue,
        timestamp: new Date(),
      });

      this.logger.log(
        `✅ Emitted revenue update to doctor ${doctorId}: ${revenue._id}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to emit revenue update to doctor ${doctorId}:`,
        error,
      );
    }
  }

  /**
   * Emit revenue delete to doctor (when pending revenue is cancelled)
   */
  emitRevenueDelete(doctorId: string, revenueId: string) {
    try {
      const roomName = `doctor_${doctorId}`;
      this.logger.log(`🗑️ Emitting revenue:delete to room: ${roomName}`);
      this.logger.log(`   - Revenue ID: ${revenueId}`);

      this.server.to(roomName).emit('revenue:delete', {
        revenueId,
        timestamp: new Date(),
      });

      this.logger.log(`✅ Revenue delete event emitted to doctor ${doctorId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to emit revenue delete to doctor ${doctorId}:`,
        error,
      );
    }
  }

  /**
   * Emit revenue summary update to doctor
   */
  emitSummaryUpdate(doctorId: string, summary: any) {
    try {
      this.server.to(`doctor_${doctorId}`).emit('revenue:summaryUpdated', {
        summary,
        timestamp: new Date(),
      });

      this.logger.log(`✅ Emitted summary update to doctor ${doctorId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to emit summary update to doctor ${doctorId}:`,
        error,
      );
    }
  }

  /**
   * Check if doctor is online
   */
  isDoctorOnline(doctorId: string): boolean {
    return this.connectedDoctors.has(doctorId);
  }

  /**
   * Get connected doctors count
   */
  getConnectedDoctorsCount(): number {
    return this.connectedDoctors.size;
  }
}
