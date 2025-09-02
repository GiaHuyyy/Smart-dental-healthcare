import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { Medication, MedicationDocument } from './schemas/medication.schema';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectModel(Medication.name)
    private medicationModel: Model<MedicationDocument>,
  ) {}

  async create(createMedicationDto: CreateMedicationDto): Promise<Medication> {
    const newMedication = new this.medicationModel(createMedicationDto);
    return newMedication.save();
  }

  async findAll(query: any): Promise<Medication[]> {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;

    // Remove pagination keys from filter
    const { limit: _l, page: _p, ...rest } = query;
    const filter = { ...rest, isActive: true };

    return this.medicationModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Medication> {
    const medication = await this.medicationModel.findById(id).exec();

    if (!medication) {
      throw new NotFoundException(`Không tìm thấy thuốc với ID: ${id}`);
    }

    return medication;
  }

  async findByName(name: string): Promise<Medication[]> {
    return this.medicationModel
      .find({
        name: { $regex: name, $options: 'i' },
        isActive: true
      })
      .limit(10)
      .exec();
  }

  async findByCategory(category: string): Promise<Medication[]> {
    return this.medicationModel
      .find({
        category: { $regex: category, $options: 'i' },
        isActive: true
      })
      .sort({ name: 1 })
      .exec();
  }

  async findByDentalUse(dentalUse: string): Promise<Medication[]> {
    return this.medicationModel
      .find({
        dentalUse: { $regex: dentalUse, $options: 'i' },
        isActive: true
      })
      .sort({ name: 1 })
      .exec();
  }

  async searchMedications(searchTerm: string): Promise<Medication[]> {
    return this.medicationModel
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { genericName: { $regex: searchTerm, $options: 'i' } },
          { category: { $regex: searchTerm, $options: 'i' } },
          { dentalUse: { $regex: searchTerm, $options: 'i' } },
          { tags: { $in: [new RegExp(searchTerm, 'i')] } }
        ],
        isActive: true
      })
      .limit(20)
      .sort({ name: 1 })
      .exec();
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.medicationModel
      .distinct('category')
      .exec();
    return categories.sort();
  }

  async getDentalUses(): Promise<string[]> {
    const dentalUses = await this.medicationModel
      .distinct('dentalUse')
      .exec();
    return dentalUses.sort();
  }

  async seedDatabase(): Promise<void> {
    const count = await this.medicationModel.countDocuments().exec();
    
    if (count > 0) {
      console.log('Database already seeded with medications');
      return;
    }

    const medications = [
      // Antibiotics
      {
        name: 'Amoxicillin 500mg',
        genericName: 'Amoxicillin',
        category: 'Antibiotic',
        dentalUse: 'Nhiễm trùng răng miệng',
        indications: [
          'Nhiễm trùng răng miệng',
          'Viêm nướu',
          'Áp xe răng',
          'Nhiễm trùng sau nhổ răng'
        ],
        contraindications: [
          'Dị ứng với penicillin',
          'Bệnh nhân suy gan nặng'
        ],
        sideEffects: [
          'Buồn nôn',
          'Tiêu chảy',
          'Phát ban da',
          'Nhiễm nấm Candida'
        ],
        dosageForms: ['Viên nang', 'Viên nén'],
        dosages: [
          {
            ageGroup: 'Người lớn',
            dosage: '500mg',
            frequency: '3 lần/ngày',
            duration: '7-10 ngày',
            notes: 'Uống trước bữa ăn 1 giờ hoặc sau bữa ăn 2 giờ'
          },
          {
            ageGroup: 'Trẻ em',
            dosage: '25-50mg/kg/ngày',
            frequency: '3 lần/ngày',
            duration: '7-10 ngày'
          }
        ],
        instructions: 'Uống đủ liều và đúng thời gian theo chỉ định của bác sĩ',
        precautions: 'Không uống rượu trong khi điều trị',
        interactions: 'Có thể làm giảm hiệu quả của thuốc tránh thai',
        storage: 'Bảo quản ở nhiệt độ phòng, tránh ánh sáng trực tiếp',
        prescriptionType: 'prescription',
        manufacturer: 'Dược phẩm Việt Nam',
        price: 15000,
        unit: 'VND',
        tags: ['kháng sinh', 'nhiễm trùng', 'răng miệng', 'amoxicillin']
      },
      {
        name: 'Clindamycin 300mg',
        genericName: 'Clindamycin',
        category: 'Antibiotic',
        dentalUse: 'Nhiễm trùng răng miệng kháng penicillin',
        indications: [
          'Nhiễm trùng răng miệng kháng penicillin',
          'Viêm xương hàm',
          'Nhiễm trùng nặng sau phẫu thuật răng miệng'
        ],
        contraindications: [
          'Dị ứng với clindamycin',
          'Bệnh nhân có tiền sử viêm đại tràng'
        ],
        sideEffects: [
          'Tiêu chảy',
          'Buồn nôn',
          'Đau bụng',
          'Viêm đại tràng giả mạc'
        ],
        dosageForms: ['Viên nang'],
        dosages: [
          {
            ageGroup: 'Người lớn',
            dosage: '300mg',
            frequency: '4 lần/ngày',
            duration: '7-14 ngày'
          }
        ],
        instructions: 'Uống với nhiều nước, tránh nằm ngay sau khi uống',
        precautions: 'Theo dõi các dấu hiệu viêm đại tràng',
        storage: 'Bảo quản ở nhiệt độ phòng',
        prescriptionType: 'prescription',
        manufacturer: 'Dược phẩm Quốc tế',
        price: 25000,
        unit: 'VND',
        tags: ['kháng sinh', 'clindamycin', 'nhiễm trùng nặng', 'kháng penicillin']
      },

      // Painkillers
      {
        name: 'Ibuprofen 400mg',
        genericName: 'Ibuprofen',
        category: 'Painkiller',
        dentalUse: 'Giảm đau răng và viêm',
        indications: [
          'Đau răng',
          'Viêm nướu',
          'Đau sau nhổ răng',
          'Đau khớp thái dương hàm'
        ],
        contraindications: [
          'Loét dạ dày tá tràng',
          'Suy thận nặng',
          'Dị ứng với NSAIDs'
        ],
        sideEffects: [
          'Đau dạ dày',
          'Buồn nôn',
          'Chóng mặt',
          'Tăng huyết áp'
        ],
        dosageForms: ['Viên nén', 'Viên nang'],
        dosages: [
          {
            ageGroup: 'Người lớn',
            dosage: '400-800mg',
            frequency: '3-4 lần/ngày',
            duration: 'Không quá 7 ngày',
            notes: 'Uống sau bữa ăn để giảm kích ứng dạ dày'
          }
        ],
        instructions: 'Uống sau bữa ăn, không uống khi đói',
        precautions: 'Không uống rượu, theo dõi chức năng thận',
        interactions: 'Tăng nguy cơ chảy máu khi dùng với warfarin',
        storage: 'Bảo quản ở nhiệt độ phòng',
        prescriptionType: 'otc',
        manufacturer: 'Dược phẩm Việt Nam',
        price: 8000,
        unit: 'VND',
        tags: ['giảm đau', 'chống viêm', 'ibuprofen', 'đau răng']
      },
      {
        name: 'Paracetamol 500mg',
        genericName: 'Paracetamol',
        category: 'Painkiller',
        dentalUse: 'Giảm đau răng và hạ sốt',
        indications: [
          'Đau răng nhẹ',
          'Sốt',
          'Đau đầu',
          'Đau sau nhổ răng'
        ],
        contraindications: [
          'Bệnh gan nặng',
          'Dị ứng với paracetamol'
        ],
        sideEffects: [
          'Phát ban da',
          'Buồn nôn',
          'Tổn thương gan (khi dùng quá liều)'
        ],
        dosageForms: ['Viên nén', 'Viên sủi'],
        dosages: [
          {
            ageGroup: 'Người lớn',
            dosage: '500-1000mg',
            frequency: '4-6 lần/ngày',
            duration: 'Không quá 10 ngày',
            notes: 'Không vượt quá 4g/ngày'
          }
        ],
        instructions: 'Uống với nước, không uống rượu',
        precautions: 'Không vượt quá liều khuyến cáo',
        interactions: 'Tăng độc tính gan khi dùng với rượu',
        storage: 'Bảo quản ở nhiệt độ phòng',
        prescriptionType: 'otc',
        manufacturer: 'Dược phẩm Việt Nam',
        price: 5000,
        unit: 'VND',
        tags: ['giảm đau', 'hạ sốt', 'paracetamol', 'đau răng nhẹ']
      },

      // Anti-inflammatory
      {
        name: 'Diclofenac 50mg',
        genericName: 'Diclofenac',
        category: 'Anti-inflammatory',
        dentalUse: 'Giảm đau và viêm răng miệng',
        indications: [
          'Đau răng nặng',
          'Viêm nướu',
          'Đau sau phẫu thuật răng miệng',
          'Viêm khớp thái dương hàm'
        ],
        contraindications: [
          'Loét dạ dày tá tràng',
          'Suy tim nặng',
          'Dị ứng với NSAIDs'
        ],
        sideEffects: [
          'Đau dạ dày',
          'Buồn nôn',
          'Chóng mặt',
          'Tăng huyết áp',
          'Phù nề'
        ],
        dosageForms: ['Viên nén', 'Viên nang'],
        dosages: [
          {
            ageGroup: 'Người lớn',
            dosage: '50mg',
            frequency: '2-3 lần/ngày',
            duration: 'Không quá 7 ngày'
          }
        ],
        instructions: 'Uống sau bữa ăn, không uống khi đói',
        precautions: 'Theo dõi chức năng thận và gan',
        interactions: 'Tăng nguy cơ chảy máu với thuốc chống đông',
        storage: 'Bảo quản ở nhiệt độ phòng',
        prescriptionType: 'prescription',
        manufacturer: 'Dược phẩm Quốc tế',
        price: 12000,
        unit: 'VND',
        tags: ['chống viêm', 'giảm đau', 'diclofenac', 'viêm răng miệng']
      },

      // Local Anesthetics
      {
        name: 'Lidocaine 2% Gel',
        genericName: 'Lidocaine',
        category: 'Local Anesthetic',
        dentalUse: 'Gây tê tại chỗ cho răng miệng',
        indications: [
          'Gây tê trước khi tiêm',
          'Giảm đau răng tạm thời',
          'Loét miệng',
          'Viêm nướu'
        ],
        contraindications: [
          'Dị ứng với lidocaine',
          'Vết thương hở',
          'Trẻ em dưới 2 tuổi'
        ],
        sideEffects: [
          'Tê lưỡi',
          'Khó nuốt',
          'Dị ứng tại chỗ',
          'Tim đập nhanh (hiếm gặp)'
        ],
        dosageForms: ['Gel', 'Thuốc xịt'],
        dosages: [
          {
            ageGroup: 'Người lớn',
            dosage: 'Lượng nhỏ',
            frequency: '3-4 lần/ngày',
            duration: 'Không quá 7 ngày'
          }
        ],
        instructions: 'Bôi trực tiếp lên vùng đau, tránh nuốt',
        precautions: 'Không sử dụng quá liều, tránh tiếp xúc mắt',
        storage: 'Bảo quản ở nhiệt độ phòng, tránh ánh sáng',
        prescriptionType: 'prescription',
        manufacturer: 'Dược phẩm Việt Nam',
        price: 45000,
        unit: 'VND',
        tags: ['gây tê', 'lidocaine', 'giảm đau tại chỗ', 'gel']
      },

      // Antiseptics
      {
        name: 'Chlorhexidine 0.12%',
        genericName: 'Chlorhexidine',
        category: 'Antiseptic',
        dentalUse: 'Sát khuẩn răng miệng',
        indications: [
          'Viêm nướu',
          'Sau phẫu thuật răng miệng',
          'Loét miệng',
          'Dự phòng nhiễm trùng'
        ],
        contraindications: [
          'Dị ứng với chlorhexidine',
          'Trẻ em dưới 6 tuổi'
        ],
        sideEffects: [
          'Nhuộm răng tạm thời',
          'Thay đổi vị giác',
          'Kích ứng niêm mạc',
          'Tăng vôi răng'
        ],
        dosageForms: ['Nước súc miệng', 'Gel'],
        dosages: [
          {
            ageGroup: 'Người lớn',
            dosage: '15ml',
            frequency: '2 lần/ngày',
            duration: 'Theo chỉ định bác sĩ',
            notes: 'Súc miệng trong 30 giây, không nuốt'
          }
        ],
        instructions: 'Súc miệng sau khi đánh răng, không ăn uống trong 30 phút',
        precautions: 'Tránh nuốt, không pha loãng',
        storage: 'Bảo quản ở nhiệt độ phòng',
        prescriptionType: 'prescription',
        manufacturer: 'Dược phẩm Việt Nam',
        price: 35000,
        unit: 'VND',
        tags: ['sát khuẩn', 'chlorhexidine', 'nước súc miệng', 'viêm nướu']
      },

      // Muscle Relaxants
      {
        name: 'Baclofen 10mg',
        genericName: 'Baclofen',
        category: 'Muscle Relaxant',
        dentalUse: 'Giảm co thắt cơ hàm',
        indications: [
          'Co thắt cơ hàm',
          'Nghiến răng',
          'Đau khớp thái dương hàm',
          'Căng cơ hàm'
        ],
        contraindications: [
          'Bệnh thận nặng',
          'Động kinh',
          'Dị ứng với baclofen'
        ],
        sideEffects: [
          'Buồn ngủ',
          'Chóng mặt',
          'Buồn nôn',
          'Yếu cơ',
          'Táo bón'
        ],
        dosageForms: ['Viên nén'],
        dosages: [
          {
            ageGroup: 'Người lớn',
            dosage: '10mg',
            frequency: '3 lần/ngày',
            duration: 'Theo chỉ định bác sĩ'
          }
        ],
        instructions: 'Uống với nước, có thể uống với thức ăn',
        precautions: 'Tránh lái xe khi mới bắt đầu điều trị',
        interactions: 'Tăng tác dụng an thần với rượu và thuốc ngủ',
        storage: 'Bảo quản ở nhiệt độ phòng',
        prescriptionType: 'prescription',
        manufacturer: 'Dược phẩm Quốc tế',
        price: 18000,
        unit: 'VND',
        tags: ['giãn cơ', 'baclofen', 'co thắt cơ hàm', 'nghiến răng']
      },

      // Vitamins and Minerals
      {
        name: 'Calcium + Vitamin D3',
        genericName: 'Calcium Carbonate + Cholecalciferol',
        category: 'Vitamin & Mineral',
        dentalUse: 'Tăng cường sức khỏe răng và xương',
        indications: [
          'Thiếu canxi',
          'Loãng xương',
          'Tăng cường sức khỏe răng',
          'Phòng ngừa sâu răng'
        ],
        contraindications: [
          'Tăng canxi máu',
          'Sỏi thận canxi',
          'Bệnh cường giáp'
        ],
        sideEffects: [
          'Táo bón',
          'Đầy bụng',
          'Buồn nôn',
          'Tăng canxi máu (hiếm gặp)'
        ],
        dosageForms: ['Viên nén', 'Viên nang'],
        dosages: [
          {
            ageGroup: 'Người lớn',
            dosage: '1000mg canxi + 400IU vitamin D3',
            frequency: '1-2 lần/ngày',
            duration: 'Dài hạn theo chỉ định'
          }
        ],
        instructions: 'Uống với nước, tốt nhất vào buổi sáng',
        precautions: 'Không uống cùng sắt, cách 2 giờ',
        interactions: 'Giảm hấp thu khi dùng với tetracycline',
        storage: 'Bảo quản ở nhiệt độ phòng, tránh ẩm',
        prescriptionType: 'otc',
        manufacturer: 'Dược phẩm Việt Nam',
        price: 25000,
        unit: 'VND',
        tags: ['canxi', 'vitamin D3', 'sức khỏe răng', 'xương chắc khỏe']
      },

      // Antifungal
      {
        name: 'Nystatin 100,000 IU/ml',
        genericName: 'Nystatin',
        category: 'Antifungal',
        dentalUse: 'Điều trị nấm miệng',
        indications: [
          'Nấm miệng (Candida)',
          'Nhiễm nấm sau dùng kháng sinh',
          'Viêm lưỡi do nấm',
          'Nấm khóe miệng'
        ],
        contraindications: [
          'Dị ứng với nystatin',
          'Nhiễm nấm toàn thân'
        ],
        sideEffects: [
          'Buồn nôn',
          'Tiêu chảy',
          'Đau bụng',
          'Dị ứng tại chỗ'
        ],
        dosageForms: ['Suspension', 'Gel'],
        dosages: [
          {
            ageGroup: 'Người lớn',
            dosage: '5ml',
            frequency: '4 lần/ngày',
            duration: '7-14 ngày',
            notes: 'Ngậm trong miệng 2-3 phút trước khi nuốt'
          }
        ],
        instructions: 'Ngậm trong miệng, không nuốt ngay',
        precautions: 'Tiếp tục điều trị đủ thời gian',
        storage: 'Bảo quản trong tủ lạnh, lắc đều trước khi dùng',
        prescriptionType: 'prescription',
        manufacturer: 'Dược phẩm Quốc tế',
        price: 55000,
        unit: 'VND',
        tags: ['chống nấm', 'nystatin', 'nấm miệng', 'candida']
      }
    ];

    try {
      await this.medicationModel.insertMany(medications);
      console.log(`Đã thêm ${medications.length} loại thuốc vào database`);
    } catch (error) {
      console.error('Lỗi khi thêm thuốc vào database:', error);
      throw error;
    }
  }
}
