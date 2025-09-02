import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { Public } from '../../decorator/customize';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { MedicationsService } from './medications.service';

@Controller('medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @Public()
  create(@Body() createMedicationDto: CreateMedicationDto) {
    return this.medicationsService.create(createMedicationDto);
  }

  @Get()
  @Public()
  findAll(@Query() query: any) {
    return this.medicationsService.findAll(query);
  }

  @Get('search')
  @Public()
  search(@Query('q') searchTerm: string) {
    return this.medicationsService.searchMedications(searchTerm);
  }

  @Get('categories')
  @Public()
  getCategories() {
    return this.medicationsService.getCategories();
  }

  @Get('dental-uses')
  @Public()
  getDentalUses() {
    return this.medicationsService.getDentalUses();
  }

  @Get('category/:category')
  @Public()
  findByCategory(@Param('category') category: string) {
    return this.medicationsService.findByCategory(category);
  }

  @Get('dental-use/:dentalUse')
  @Public()
  findByDentalUse(@Param('dentalUse') dentalUse: string) {
    return this.medicationsService.findByDentalUse(dentalUse);
  }

  @Get('name/:name')
  @Public()
  findByName(@Param('name') name: string) {
    return this.medicationsService.findByName(name);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.medicationsService.findOne(id);
  }

  @Post('seed')
  @Public()
  async seedDatabase() {
    await this.medicationsService.seedDatabase();
    return { message: 'Database seeded successfully' };
  }
}
