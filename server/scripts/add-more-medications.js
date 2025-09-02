const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-dental-healthcare', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Medication Schema
const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  genericName: { type: String, required: true },
  category: { type: String, required: true },
  dentalUse: { type: String, required: true },
  indications: [String],
  contraindications: [String],
  sideEffects: [String],
  dosageForms: [String],
  dosages: [{
    ageGroup: String,
    dosage: String,
    frequency: String,
    duration: String,
    notes: String
  }],
  instructions: String,
  precautions: String,
  interactions: String,
  storage: String,
  isActive: { type: Boolean, default: true },
  prescriptionType: { type: String, default: 'prescription' },
  manufacturer: String,
  price: Number,
  unit: String,
  tags: [String]
}, { timestamps: true });

const Medication = mongoose.model('Medication', medicationSchema);

// Additional medications data
const additionalMedications = [
  // Additional Antibiotics
  {
    name: 'Azithromycin 500mg',
    genericName: 'Azithromycin',
    category: 'Antibiotic',
    dentalUse: 'Nhiễm trùng răng miệng do vi khuẩn không điển hình',
    indications: [
      'Nhiễm trùng răng miệng do Chlamydia',
      'Nhiễm trùng đường hô hấp trên',
      'Viêm nướu do vi khuẩn không điển hình'
    ],
    contraindications: [
      'Dị ứng với azithromycin',
      'Bệnh nhân có tiền sử rối loạn nhịp tim',
      'Suy gan nặng'
    ],
    sideEffects: [
      'Buồn nôn',
      'Tiêu chảy',
      'Đau bụng',
      'Chóng mặt',
      'Rối loạn nhịp tim (hiếm gặp)'
    ],
    dosageForms: ['Viên nén', 'Viên nang'],
    dosages: [
      {
        ageGroup: 'Người lớn',
        dosage: '500mg',
        frequency: '1 lần/ngày',
        duration: '3 ngày',
        notes: 'Uống trước bữa ăn 1 giờ hoặc sau bữa ăn 2 giờ'
      }
    ],
    instructions: 'Uống đủ liều theo chỉ định, không bỏ liều',
    precautions: 'Theo dõi nhịp tim, tránh dùng với thuốc chống loạn nhịp',
    interactions: 'Tương tác với warfarin, digoxin, theophylline',
    storage: 'Bảo quản ở nhiệt độ phòng, tránh ẩm',
    prescriptionType: 'prescription',
    manufacturer: 'Dược phẩm Quốc tế',
    price: 28000,
    unit: 'VND',
    tags: ['kháng sinh', 'azithromycin', 'nhiễm trùng không điển hình', '3 ngày']
  },

  // Additional Painkillers
  {
    name: 'Ketorolac 10mg',
    genericName: 'Ketorolac',
    category: 'Painkiller',
    dentalUse: 'Giảm đau răng nặng sau phẫu thuật',
    indications: [
      'Đau răng nặng',
      'Đau sau phẫu thuật răng miệng',
      'Đau do viêm dây thần kinh răng',
      'Đau cấp tính không đáp ứng với thuốc thông thường'
    ],
    contraindications: [
      'Loét dạ dày tá tràng',
      'Suy thận nặng',
      'Suy tim nặng',
      'Dị ứng với NSAIDs',
      'Phụ nữ có thai 3 tháng cuối'
    ],
    sideEffects: [
      'Đau dạ dày',
      'Buồn nôn',
      'Chóng mặt',
      'Tăng huyết áp',
      'Phù nề',
      'Tổn thương thận'
    ],
    dosageForms: ['Viên nén'],
    dosages: [
      {
        ageGroup: 'Người lớn',
        dosage: '10mg',
        frequency: '4 lần/ngày',
        duration: 'Không quá 5 ngày',
        notes: 'Không vượt quá 40mg/ngày'
      }
    ],
    instructions: 'Uống sau bữa ăn, không uống khi đói',
    precautions: 'Theo dõi chức năng thận, không dùng dài hạn',
    interactions: 'Tăng nguy cơ chảy máu với thuốc chống đông',
    storage: 'Bảo quản ở nhiệt độ phòng',
    prescriptionType: 'prescription',
    manufacturer: 'Dược phẩm Quốc tế',
    price: 32000,
    unit: 'VND',
    tags: ['giảm đau mạnh', 'ketorolac', 'đau sau phẫu thuật', 'NSAID']
  },

  // Additional Anti-inflammatory
  {
    name: 'Celecoxib 200mg',
    genericName: 'Celecoxib',
    category: 'Anti-inflammatory',
    dentalUse: 'Giảm đau và viêm răng miệng với ít tác dụng phụ dạ dày',
    indications: [
      'Đau răng do viêm',
      'Viêm nướu',
      'Viêm khớp thái dương hàm',
      'Đau sau phẫu thuật răng miệng'
    ],
    contraindications: [
      'Dị ứng với celecoxib',
      'Bệnh nhân có tiền sử bệnh tim mạch',
      'Suy tim nặng',
      'Phụ nữ có thai 3 tháng cuối'
    ],
    sideEffects: [
      'Đau đầu',
      'Chóng mặt',
      'Buồn nôn',
      'Tăng huyết áp',
      'Phù nề',
      'Tăng nguy cơ tim mạch'
    ],
    dosageForms: ['Viên nang'],
    dosages: [
      {
        ageGroup: 'Người lớn',
        dosage: '200mg',
        frequency: '1-2 lần/ngày',
        duration: 'Không quá 7 ngày'
      }
    ],
    instructions: 'Uống với thức ăn, không uống khi đói',
    precautions: 'Theo dõi huyết áp, chức năng tim mạch',
    interactions: 'Tăng nguy cơ chảy máu với thuốc chống đông',
    storage: 'Bảo quản ở nhiệt độ phòng',
    prescriptionType: 'prescription',
    manufacturer: 'Dược phẩm Quốc tế',
    price: 45000,
    unit: 'VND',
    tags: ['chống viêm', 'celecoxib', 'ít tác dụng phụ dạ dày', 'COX-2 inhibitor']
  },

  // Additional Local Anesthetics
  {
    name: 'Articaine 4% + Epinephrine 1:100,000',
    genericName: 'Articaine',
    category: 'Local Anesthetic',
    dentalUse: 'Gây tê cho các thủ thuật nha khoa phức tạp',
    indications: [
      'Gây tê cho nhổ răng',
      'Gây tê cho điều trị tủy răng',
      'Gây tê cho phẫu thuật răng miệng',
      'Gây tê cho cấy ghép răng'
    ],
    contraindications: [
      'Dị ứng với articaine',
      'Bệnh nhân có tiền sử bệnh tim nặng',
      'Tăng huyết áp không kiểm soát',
      'Bệnh nhân dùng thuốc chống đông'
    ],
    sideEffects: [
      'Tê lưỡi và môi',
      'Khó nuốt',
      'Tim đập nhanh',
      'Tăng huyết áp',
      'Dị ứng tại chỗ'
    ],
    dosageForms: ['Dung dịch tiêm'],
    dosages: [
      {
        ageGroup: 'Người lớn',
        dosage: '1.7ml',
        frequency: 'Theo chỉ định',
        duration: '2-4 giờ',
        notes: 'Tiêm bởi bác sĩ nha khoa'
      }
    ],
    instructions: 'Chỉ sử dụng bởi bác sĩ nha khoa có chuyên môn',
    precautions: 'Theo dõi dấu hiệu sinh tồn, chuẩn bị thuốc giải độc',
    interactions: 'Tăng tác dụng với thuốc chống đông',
    storage: 'Bảo quản trong tủ lạnh, tránh ánh sáng',
    prescriptionType: 'prescription',
    manufacturer: 'Dược phẩm Quốc tế',
    price: 85000,
    unit: 'VND',
    tags: ['gây tê', 'articaine', 'epinephrine', 'tiêm', 'phẫu thuật']
  },

  // Additional Antiseptics
  {
    name: 'Povidone-Iodine 10%',
    genericName: 'Povidone-Iodine',
    category: 'Antiseptic',
    dentalUse: 'Sát khuẩn mạnh cho vùng phẫu thuật răng miệng',
    indications: [
      'Sát khuẩn trước phẫu thuật răng miệng',
      'Sát khuẩn vết thương sau phẫu thuật',
      'Sát khuẩn dụng cụ nha khoa',
      'Điều trị nhiễm trùng nặng'
    ],
    contraindications: [
      'Dị ứng với iodine',
      'Bệnh nhân có bệnh tuyến giáp',
      'Phụ nữ có thai',
      'Trẻ em dưới 2 tuổi'
    ],
    sideEffects: [
      'Kích ứng da',
      'Nhuộm da tạm thời',
      'Dị ứng tại chỗ',
      'Rối loạn chức năng tuyến giáp (khi dùng dài hạn)'
    ],
    dosageForms: ['Dung dịch', 'Gel', 'Thuốc xịt'],
    dosages: [
      {
        ageGroup: 'Người lớn',
        dosage: 'Lượng vừa đủ',
        frequency: '2-3 lần/ngày',
        duration: 'Theo chỉ định bác sĩ',
        notes: 'Bôi hoặc xịt trực tiếp lên vùng cần sát khuẩn'
      }
    ],
    instructions: 'Bôi trực tiếp lên vùng cần sát khuẩn, tránh nuốt',
    precautions: 'Tránh tiếp xúc mắt, không sử dụng trên vết thương hở lớn',
    interactions: 'Có thể làm giảm hiệu quả của thuốc kháng sinh tại chỗ',
    storage: 'Bảo quản ở nhiệt độ phòng, tránh ánh sáng',
    prescriptionType: 'prescription',
    manufacturer: 'Dược phẩm Quốc tế',
    price: 42000,
    unit: 'VND',
    tags: ['sát khuẩn mạnh', 'povidone-iodine', 'phẫu thuật', 'iodine']
  },

  // Additional Muscle Relaxants
  {
    name: 'Tizanidine 2mg',
    genericName: 'Tizanidine',
    category: 'Muscle Relaxant',
    dentalUse: 'Giảm co thắt cơ hàm và đau khớp thái dương',
    indications: [
      'Co thắt cơ hàm',
      'Nghiến răng',
      'Đau khớp thái dương hàm',
      'Căng cơ hàm do stress',
      'Đau đầu do căng cơ'
    ],
    contraindications: [
      'Dị ứng với tizanidine',
      'Bệnh nhân có tiền sử bệnh gan nặng',
      'Suy thận nặng',
      'Phụ nữ có thai'
    ],
    sideEffects: [
      'Buồn ngủ',
      'Chóng mặt',
      'Buồn nôn',
      'Yếu cơ',
      'Táo bón',
      'Hạ huyết áp',
      'Tổn thương gan'
    ],
    dosageForms: ['Viên nén'],
    dosages: [
      {
        ageGroup: 'Người lớn',
        dosage: '2-4mg',
        frequency: '3 lần/ngày',
        duration: 'Theo chỉ định bác sĩ',
        notes: 'Bắt đầu với liều thấp, tăng dần theo đáp ứng'
      }
    ],
    instructions: 'Uống với nước, có thể uống với thức ăn',
    precautions: 'Tránh lái xe, theo dõi chức năng gan',
    interactions: 'Tăng tác dụng an thần với rượu và thuốc ngủ',
    storage: 'Bảo quản ở nhiệt độ phòng',
    prescriptionType: 'prescription',
    manufacturer: 'Dược phẩm Quốc tế',
    price: 28000,
    unit: 'VND',
    tags: ['giãn cơ', 'tizanidine', 'co thắt cơ hàm', 'nghiến răng', 'stress']
  },

  // Additional Vitamins and Minerals
  {
    name: 'Vitamin C 1000mg + Zinc 15mg',
    genericName: 'Ascorbic Acid + Zinc Sulfate',
    category: 'Vitamin & Mineral',
    dentalUse: 'Tăng cường miễn dịch và chữa lành vết thương răng miệng',
    indications: [
      'Tăng cường miễn dịch',
      'Chữa lành vết thương sau phẫu thuật',
      'Viêm nướu',
      'Loét miệng',
      'Thiếu vitamin C và kẽm'
    ],
    contraindications: [
      'Dị ứng với vitamin C hoặc kẽm',
      'Bệnh nhân có tiền sử sỏi thận',
      'Bệnh Wilson',
      'Tăng canxi máu'
    ],
    sideEffects: [
      'Buồn nôn',
      'Tiêu chảy',
      'Đau dạ dày',
      'Đau đầu',
      'Mất ngủ (khi dùng liều cao)'
    ],
    dosageForms: ['Viên nén', 'Viên sủi'],
    dosages: [
      {
        ageGroup: 'Người lớn',
        dosage: '1000mg vitamin C + 15mg kẽm',
        frequency: '1-2 lần/ngày',
        duration: 'Dài hạn theo chỉ định'
      }
    ],
    instructions: 'Uống với nước, tốt nhất vào buổi sáng',
    precautions: 'Không vượt quá liều khuyến cáo, uống nhiều nước',
    interactions: 'Tăng hấp thu sắt, giảm hấp thu đồng',
    storage: 'Bảo quản ở nhiệt độ phòng, tránh ẩm',
    prescriptionType: 'otc',
    manufacturer: 'Dược phẩm Việt Nam',
    price: 18000,
    unit: 'VND',
    tags: ['vitamin C', 'kẽm', 'miễn dịch', 'chữa lành vết thương', 'viêm nướu']
  },

  // Additional Antifungal
  {
    name: 'Fluconazole 150mg',
    genericName: 'Fluconazole',
    category: 'Antifungal',
    dentalUse: 'Điều trị nấm miệng kháng nystatin',
    indications: [
      'Nấm miệng kháng nystatin',
      'Nhiễm nấm Candida nặng',
      'Nhiễm nấm sau dùng kháng sinh dài ngày',
      'Nhiễm nấm ở bệnh nhân suy giảm miễn dịch'
    ],
    contraindications: [
      'Dị ứng với fluconazole',
      'Bệnh nhân có tiền sử bệnh tim nặng',
      'Suy gan nặng',
      'Phụ nữ có thai 3 tháng đầu'
    ],
    sideEffects: [
      'Buồn nôn',
      'Tiêu chảy',
      'Đau đầu',
      'Chóng mặt',
      'Phát ban da',
      'Rối loạn chức năng gan'
    ],
    dosageForms: ['Viên nén', 'Viên nang'],
    dosages: [
      {
        ageGroup: 'Người lớn',
        dosage: '150mg',
        frequency: '1 lần/ngày',
        duration: '7-14 ngày',
        notes: 'Uống với nước, có thể uống với thức ăn'
      }
    ],
    instructions: 'Uống đủ liều và đúng thời gian theo chỉ định',
    precautions: 'Theo dõi chức năng gan, tránh rượu',
    interactions: 'Tương tác với warfarin, phenytoin, cyclosporine',
    storage: 'Bảo quản ở nhiệt độ phòng',
    prescriptionType: 'prescription',
    manufacturer: 'Dược phẩm Quốc tế',
    price: 38000,
    unit: 'VND',
    tags: ['chống nấm', 'fluconazole', 'nấm miệng kháng thuốc', 'candida']
  },

  // Additional Antibiotics
  {
    name: 'Doxycycline 100mg',
    genericName: 'Doxycycline',
    category: 'Antibiotic',
    dentalUse: 'Nhiễm trùng răng miệng do vi khuẩn kháng penicillin',
    indications: [
      'Nhiễm trùng răng miệng kháng penicillin',
      'Viêm nướu do vi khuẩn kỵ khí',
      'Nhiễm trùng sau phẫu thuật răng miệng',
      'Áp xe răng'
    ],
    contraindications: [
      'Dị ứng với tetracycline',
      'Phụ nữ có thai',
      'Trẻ em dưới 8 tuổi',
      'Bệnh nhân suy gan nặng'
    ],
    sideEffects: [
      'Buồn nôn',
      'Tiêu chảy',
      'Đau dạ dày',
      'Nhạy cảm với ánh sáng',
      'Nhuộm răng (ở trẻ em)',
      'Viêm thực quản'
    ],
    dosageForms: ['Viên nén', 'Viên nang'],
    dosages: [
      {
        ageGroup: 'Người lớn',
        dosage: '100mg',
        frequency: '2 lần/ngày',
        duration: '7-14 ngày',
        notes: 'Uống với nhiều nước, tránh nằm ngay sau khi uống'
      }
    ],
    instructions: 'Uống với nhiều nước, tránh ánh sáng mặt trời',
    precautions: 'Tránh ánh nắng, uống nhiều nước, không nằm ngay sau khi uống',
    interactions: 'Giảm hiệu quả khi dùng với sắt, canxi, antacid',
    storage: 'Bảo quản ở nhiệt độ phòng, tránh ánh sáng',
    prescriptionType: 'prescription',
    manufacturer: 'Dược phẩm Quốc tế',
    price: 22000,
    unit: 'VND',
    tags: ['kháng sinh', 'doxycycline', 'tetracycline', 'kháng penicillin', 'nhiễm trùng kỵ khí']
  },

  // Additional Painkillers
  {
    name: 'Codeine 30mg + Paracetamol 500mg',
    genericName: 'Codeine + Paracetamol',
    category: 'Painkiller',
    dentalUse: 'Giảm đau răng nặng không đáp ứng với thuốc thông thường',
    indications: [
      'Đau răng nặng',
      'Đau sau phẫu thuật răng miệng',
      'Đau thần kinh răng',
      'Đau không đáp ứng với thuốc thông thường'
    ],
    contraindications: [
      'Dị ứng với codeine hoặc paracetamol',
      'Bệnh nhân có tiền sử nghiện ma túy',
      'Suy hô hấp nặng',
      'Trẻ em dưới 12 tuổi',
      'Phụ nữ có thai'
    ],
    sideEffects: [
      'Buồn ngủ',
      'Chóng mặt',
      'Buồn nôn',
      'Táo bón',
      'Ức chế hô hấp',
      'Nghiện thuốc (khi dùng dài hạn)'
    ],
    dosageForms: ['Viên nén'],
    dosages: [
      {
        ageGroup: 'Người lớn',
        dosage: '30mg codeine + 500mg paracetamol',
        frequency: '4-6 lần/ngày',
        duration: 'Không quá 3 ngày',
        notes: 'Không vượt quá 240mg codeine/ngày'
      }
    ],
    instructions: 'Uống với nước, có thể uống với thức ăn',
    precautions: 'Tránh lái xe, không uống rượu, theo dõi hô hấp',
    interactions: 'Tăng tác dụng an thần với rượu và thuốc ngủ',
    storage: 'Bảo quản ở nhiệt độ phòng',
    prescriptionType: 'prescription',
    manufacturer: 'Dược phẩm Quốc tế',
    price: 35000,
    unit: 'VND',
    tags: ['giảm đau mạnh', 'codeine', 'paracetamol', 'thuốc gây nghiện', 'đau răng nặng']
  }
];

// Add medications function
async function addMoreMedications() {
  try {
    console.log('🔄 Đang thêm thuốc mới vào database...');
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const medication of additionalMedications) {
      try {
        // Check if medication already exists
        const existing = await Medication.findOne({ name: medication.name });
        
        if (existing) {
          console.log(`⏭️  Thuốc "${medication.name}" đã tồn tại, bỏ qua`);
          skippedCount++;
          continue;
        }
        
        // Add new medication
        await Medication.create(medication);
        console.log(`✅ Đã thêm: ${medication.name}`);
        addedCount++;
        
      } catch (error) {
        console.error(`❌ Lỗi khi thêm ${medication.name}:`, error.message);
      }
    }
    
    console.log('\n📊 Kết quả:');
    console.log(`✅ Đã thêm: ${addedCount} loại thuốc mới`);
    console.log(`⏭️  Bỏ qua: ${skippedCount} loại thuốc đã tồn tại`);
    
    // Get updated statistics
    const totalCount = await Medication.countDocuments();
    const categories = await Medication.distinct('category');
    const dentalUses = await Medication.distinct('dentalUse');
    
    console.log(`\n📈 Thống kê cập nhật:`);
    console.log(`📊 Tổng số thuốc: ${totalCount}`);
    console.log(`📋 Danh mục: ${categories.join(', ')}`);
    console.log(`🦷 Chỉ định nha khoa: ${dentalUses.length} loại`);
    
  } catch (error) {
    console.error('❌ Lỗi khi thêm thuốc:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Đã đóng kết nối database');
  }
}

// Run the function
addMoreMedications();
