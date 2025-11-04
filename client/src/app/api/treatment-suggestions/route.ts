import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${apiUrl}/api/v1/treatment-suggestions`, {
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // Fallback to static suggestions if backend doesn't have this endpoint
      const fallbackSuggestions = {
        chiefComplaints: [
          "Đau răng",
          "Chảy máu chân răng",
          "Sưng nướu",
          "Nhạy cảm răng",
          "Răng bị gãy",
          "Đau hàm",
          "Khô miệng",
          "Hôi miệng",
          "Mọc răng khôn",
          "Tụt nướu",
        ],
        diagnoses: [
          "Sâu răng",
          "Viêm nướu",
          "Viêm tủy răng",
          "Áp xe răng",
          "Tụt nướu",
          "Viêm quanh răng",
          "Mài mòn răng",
          "Gãy răng",
          "Tật cắn",
          "Răng khôn mọc lệch",
        ],
        treatmentPlans: [
          "Hàn răng composite",
          "Lấy tủy răng",
          "Nhổ răng",
          "Cạo vôi răng",
          "Bọc răng sứ",
          "Cấy ghép implant",
          "Niềng răng",
          "Tẩy trắng răng",
          "Phẫu thuật nướu",
          "Điều trị nha chu",
        ],
        medications: [
          "Amoxicillin 500mg",
          "Metronidazole 250mg",
          "Ibuprofen 400mg",
          "Paracetamol 500mg",
          "Nước súc miệng Chlorhexidine",
          "Gel bôi nướu",
          "Thuốc giảm đau Ketoprofen",
          "Kháng sinh Cefuroxime",
          "Thuốc chống viêm Prednisolone",
          "Vitamin C",
        ],
        // Mapping between diagnoses and suitable treatment plans
        diagnosisTreatmentMap: {
          "Sâu răng": ["Hàn răng composite", "Hàn răng amalgam", "Lấy tủy răng", "Bọc răng sứ", "Nhổ răng"],
          "Viêm nướu": [
            "Cạo vôi răng",
            "Điều trị nha chu",
            "Phẫu thuật nướu",
            "Vệ sinh răng miệng",
            "Súc miệng kháng khuẩn",
          ],
          "Viêm tủy răng": ["Lấy tủy răng", "Bọc răng sứ", "Nhổ răng", "Điều trị tủy"],
          "Áp xe răng": ["Lấy tủy răng", "Nhổ răng", "Dẫn lưu áp xe", "Kháng sinh", "Phẫu thuật"],
          "Tụt nướu": ["Phẫu thuật nướu", "Ghép nướu", "Điều trị nha chu", "Làm sạch chân răng"],
          "Viêm quanh răng": ["Cạo vôi răng", "Điều trị nha chu", "Phẫu thuật nướu", "Kháng sinh"],
          "Mài mòn răng": ["Bọc răng sứ", "Hàn răng composite", "Làm máng cắn", "Điều chỉnh cắn"],
          "Gãy răng": ["Hàn răng composite", "Bọc răng sứ", "Nhổ răng", "Implant", "Cầu răng"],
          "Tật cắn": ["Niềng răng", "Điều chỉnh cắn", "Phẫu thuật hàm mặt", "Làm máng cắn"],
          "Răng khôn mọc lệch": ["Nhổ răng khôn", "Phẫu thuật nhổ răng", "Theo dõi", "Niềng răng"],
        },
        // Mapping between diagnoses and suitable medications
        diagnosisMedicationMap: {
          "Sâu răng": [
            {
              name: "Ibuprofen 400mg",
              dosage: "400mg",
              frequency: "3 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Paracetamol 500mg",
              dosage: "500mg",
              frequency: "3 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống khi đau",
            },
          ],
          "Viêm nướu": [
            {
              name: "Metronidazole 250mg",
              dosage: "250mg",
              frequency: "3 lần/ngày",
              duration: "7 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Nước súc miệng Chlorhexidine",
              dosage: "10ml",
              frequency: "2 lần/ngày",
              duration: "7-10 ngày",
              instructions: "Súc miệng sau đánh răng",
            },
            {
              name: "Gel bôi nướu",
              dosage: "Bôi mỏng",
              frequency: "2-3 lần/ngày",
              duration: "5-7 ngày",
              instructions: "Bôi lên vùng nướu viêm",
            },
          ],
          "Viêm tủy răng": [
            {
              name: "Amoxicillin 500mg",
              dosage: "500mg",
              frequency: "3 lần/ngày",
              duration: "7 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Ibuprofen 400mg",
              dosage: "400mg",
              frequency: "3 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Thuốc giảm đau Ketoprofen",
              dosage: "50mg",
              frequency: "2 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống khi đau",
            },
          ],
          "Áp xe răng": [
            {
              name: "Amoxicillin 500mg",
              dosage: "500mg",
              frequency: "3 lần/ngày",
              duration: "7-10 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Metronidazole 250mg",
              dosage: "250mg",
              frequency: "3 lần/ngày",
              duration: "7 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Ibuprofen 400mg",
              dosage: "400mg",
              frequency: "3 lần/ngày",
              duration: "5 ngày",
              instructions: "Uống sau ăn",
            },
          ],
          "Tụt nướu": [
            {
              name: "Nước súc miệng Chlorhexidine",
              dosage: "10ml",
              frequency: "2 lần/ngày",
              duration: "14 ngày",
              instructions: "Súc miệng sau đánh răng",
            },
            {
              name: "Vitamin C",
              dosage: "500mg",
              frequency: "1 lần/ngày",
              duration: "30 ngày",
              instructions: "Uống sau ăn sáng",
            },
          ],
          "Viêm quanh răng": [
            {
              name: "Amoxicillin 500mg",
              dosage: "500mg",
              frequency: "3 lần/ngày",
              duration: "7 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Nước súc miệng Chlorhexidine",
              dosage: "10ml",
              frequency: "2 lần/ngày",
              duration: "7-10 ngày",
              instructions: "Súc miệng sau đánh răng",
            },
            {
              name: "Ibuprofen 400mg",
              dosage: "400mg",
              frequency: "3 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống sau ăn",
            },
          ],
          "Mài mòn răng": [
            {
              name: "Gel chống ê buốt",
              dosage: "Bôi mỏng",
              frequency: "2 lần/ngày",
              duration: "14 ngày",
              instructions: "Bôi lên vùng ê buốt",
            },
          ],
          "Gãy răng": [
            {
              name: "Ibuprofen 400mg",
              dosage: "400mg",
              frequency: "3 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Paracetamol 500mg",
              dosage: "500mg",
              frequency: "3 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống khi đau",
            },
          ],
          "Tật cắn": [
            {
              name: "Ibuprofen 400mg",
              dosage: "400mg",
              frequency: "2 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống khi đau",
            },
          ],
          "Răng khôn mọc lệch": [
            {
              name: "Amoxicillin 500mg",
              dosage: "500mg",
              frequency: "3 lần/ngày",
              duration: "5-7 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Ibuprofen 400mg",
              dosage: "400mg",
              frequency: "3 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Nước súc miệng Chlorhexidine",
              dosage: "10ml",
              frequency: "2 lần/ngày",
              duration: "7 ngày",
              instructions: "Súc miệng nhẹ nhàng",
            },
          ],
        },
        // Mapping between treatment plans and additional medications
        treatmentMedicationMap: {
          "Lấy tủy răng": [
            {
              name: "Amoxicillin 500mg",
              dosage: "500mg",
              frequency: "3 lần/ngày",
              duration: "7 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Ibuprofen 400mg",
              dosage: "400mg",
              frequency: "3 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống sau ăn",
            },
          ],
          "Nhổ răng": [
            {
              name: "Amoxicillin 500mg",
              dosage: "500mg",
              frequency: "3 lần/ngày",
              duration: "5-7 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Ibuprofen 400mg",
              dosage: "400mg",
              frequency: "3 lần/ngày",
              duration: "3-5 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Nước súc miệng Chlorhexidine",
              dosage: "10ml",
              frequency: "2 lần/ngày",
              duration: "7 ngày",
              instructions: "Súc miệng nhẹ nhàng",
            },
          ],
          "Phẫu thuật nướu": [
            {
              name: "Amoxicillin 500mg",
              dosage: "500mg",
              frequency: "3 lần/ngày",
              duration: "7-10 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Metronidazole 250mg",
              dosage: "250mg",
              frequency: "3 lần/ngày",
              duration: "7 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Nước súc miệng Chlorhexidine",
              dosage: "10ml",
              frequency: "2 lần/ngày",
              duration: "14 ngày",
              instructions: "Súc miệng sau đánh răng",
            },
          ],
          "Nhổ răng khôn": [
            {
              name: "Amoxicillin 500mg",
              dosage: "500mg",
              frequency: "3 lần/ngày",
              duration: "7 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Ibuprofen 400mg",
              dosage: "400mg",
              frequency: "3 lần/ngày",
              duration: "5 ngày",
              instructions: "Uống sau ăn",
            },
            {
              name: "Nước súc miệng Chlorhexidine",
              dosage: "10ml",
              frequency: "2 lần/ngày",
              duration: "7 ngày",
              instructions: "Súc miệng nhẹ nhàng",
            },
          ],
        },
      };

      return NextResponse.json(fallbackSuggestions);
    }
  } catch (error) {
    console.error("API route error:", error);

    // Return fallback suggestions on error
    const fallbackSuggestions = {
      chiefComplaints: ["Đau răng", "Chảy máu chân răng", "Sưng nướu", "Nhạy cảm răng", "Răng bị gãy"],
      diagnoses: ["Sâu răng", "Viêm nướu", "Viêm tủy răng", "Áp xe răng", "Tụt nướu"],
      treatmentPlans: ["Hàn răng composite", "Lấy tủy răng", "Nhổ răng", "Cạo vôi răng", "Bọc răng sứ"],
      medications: [
        "Amoxicillin 500mg",
        "Metronidazole 250mg",
        "Ibuprofen 400mg",
        "Paracetamol 500mg",
        "Nước súc miệng Chlorhexidine",
      ],
      diagnosisTreatmentMap: {
        "Sâu răng": ["Hàn răng composite", "Lấy tủy răng", "Bọc răng sứ"],
        "Viêm nướu": ["Cạo vôi răng", "Điều trị nha chu"],
        "Viêm tủy răng": ["Lấy tủy răng", "Bọc răng sứ"],
        "Áp xe răng": ["Lấy tủy răng", "Nhổ răng"],
        "Tụt nướu": ["Phẫu thuật nướu", "Điều trị nha chu"],
      },
      diagnosisMedicationMap: {
        "Sâu răng": [
          {
            name: "Ibuprofen 400mg",
            dosage: "400mg",
            frequency: "3 lần/ngày",
            duration: "3-5 ngày",
            instructions: "Uống sau ăn",
          },
        ],
        "Viêm nướu": [
          {
            name: "Nước súc miệng Chlorhexidine",
            dosage: "10ml",
            frequency: "2 lần/ngày",
            duration: "7 ngày",
            instructions: "Súc miệng sau đánh răng",
          },
        ],
        "Viêm tủy răng": [
          {
            name: "Amoxicillin 500mg",
            dosage: "500mg",
            frequency: "3 lần/ngày",
            duration: "7 ngày",
            instructions: "Uống sau ăn",
          },
        ],
        "Áp xe răng": [
          {
            name: "Amoxicillin 500mg",
            dosage: "500mg",
            frequency: "3 lần/ngày",
            duration: "7 ngày",
            instructions: "Uống sau ăn",
          },
        ],
        "Tụt nướu": [
          {
            name: "Nước súc miệng Chlorhexidine",
            dosage: "10ml",
            frequency: "2 lần/ngày",
            duration: "14 ngày",
            instructions: "Súc miệng sau đánh răng",
          },
        ],
      },
    };

    return NextResponse.json(fallbackSuggestions);
  }
}
