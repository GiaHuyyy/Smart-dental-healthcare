import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Public } from 'src/decorator/customize';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @Public()
  create(@Body() createReportDto: CreateReportDto) {
    return this.reportsService.create(createReportDto);
  }

  @Get()
  @Public()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    return this.reportsService.findAll(+page, +limit, status);
  }

  @Get('user/:userId')
  @Public()
  findByUser(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reportsService.findByUser(userId, +page, +limit);
  }

  @Get('assignee/:assigneeId')
  @Public()
  findByAssignee(
    @Param('assigneeId') assigneeId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reportsService.findByAssignee(assigneeId, +page, +limit);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  update(@Param('id') id: string, @Body() updateReportDto: UpdateReportDto) {
    return this.reportsService.update(id, updateReportDto);
  }

  @Patch(':id/assign/:assigneeId')
  @Public()
  assignReport(
    @Param('id') id: string,
    @Param('assigneeId') assigneeId: string,
  ) {
    return this.reportsService.assignReport(id, assigneeId);
  }

  @Patch(':id/resolve')
  @Public()
  resolveReport(
    @Param('id') id: string,
    @Body('resolution') resolution: string,
  ) {
    return this.reportsService.resolveReport(id, resolution);
  }

  @Patch(':id/participant/:participantId')
  @Public()
  addParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ) {
    return this.reportsService.addParticipant(id, participantId);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id') id: string) {
    return this.reportsService.remove(id);
  }
}