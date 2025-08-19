import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Public } from 'src/decorator/customize';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Public()
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(createReviewDto);
  }

  @Get()
  @Public()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reviewsService.findAll(+page, +limit);
  }

  @Get('doctor/:doctorId')
  @Public()
  findByDoctor(
    @Param('doctorId') doctorId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reviewsService.findByDoctor(doctorId, +page, +limit);
  }

  @Get('patient/:patientId')
  @Public()
  findByPatient(
    @Param('patientId') patientId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reviewsService.findByPatient(patientId, +page, +limit);
  }

  @Get('doctor/:doctorId/rating')
  @Public()
  getDoctorRating(@Param('doctorId') doctorId: string) {
    return this.reviewsService.getDoctorRating(doctorId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewsService.update(id, updateReviewDto);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}