import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { GeocodingService, GeocodingResult } from './geocoding.service';
import { Public } from '../../decorator/public.decorator';

class GeocodeAddressDto {
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  address: string;
}

@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Public()
  @Post('geocode')
  @HttpCode(HttpStatus.OK)
  async geocodeAddress(
    @Body() body: GeocodeAddressDto,
  ): Promise<GeocodingResult> {
    return this.geocodingService.geocodeAddress(body.address);
  }
}
