import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Public } from 'src/decorator/customize';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Public()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @Public()
  findAll(
    @Query() query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.notificationsService.findAll(query, +current, +pageSize);
  }

  @Get('user/:userId')
  @Public()
  findByUser(@Param('userId') userId: string) {
    return this.notificationsService.findByUser(userId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  @Patch(':id/read')
  @Public()
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('user/:userId/read-all')
  @Public()
  markAllAsRead(@Param('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}