"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import {
  Star,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronDown,
  Quote,
  ChevronLeft,
  Calendar,
  Stethoscope,
  FileCheck,
  CreditCard,
  Send,
  Sparkles,
  CircleDot,
  Heart,
  Scissors,
  Baby,
} from "lucide-react";

import tooth from "../../public/tooth.svg";
import HeroImage from "../../public/images/hero-doctor.png";
import Testimonial1 from "../../public/images/testimonial-1.jpg";
import Testimonial2 from "../../public/images/testimonial-2.jpg";
import Testimonial3 from "../../public/images/testimonial-3.jpg";
import AboutTeam from "../../public/images/about-team.jpg";
import Blog1 from "../../public/images/blog-1.jpg";
import Blog2 from "../../public/images/blog-2.jpg";
import Blog3 from "../../public/images/blog-3.jpg";

export default function HomePage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const stats = [
    { number: "20+", label: "Năm kinh nghiệm" },
    { number: "95+", label: "Bác sĩ chuyên môn" },
    { number: "5,000+", label: "Bệnh nhân hài lòng" },
    { number: "10+", label: "Giải thưởng y tế" },
  ];

  const departments = [
    {
      icon: <Stethoscope className="w-8 h-8" />,
      title: "Khám tổng quát",
      description: "Kiểm tra sức khỏe răng miệng định kỳ",
    },
    {
      icon: <Baby className="w-8 h-8" />,
      title: "Nha khoa trẻ em",
      description: "Chăm sóc răng miệng cho trẻ nhỏ",
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Nha khoa thẩm mỹ",
      description: "Làm đẹp nụ cười hoàn hảo",
    },
    {
      icon: <CircleDot className="w-8 h-8" />,
      title: "Chỉnh nha",
      description: "Niềng răng, chỉnh hình hàm",
    },
    {
      icon: <Scissors className="w-8 h-8" />,
      title: "Phẫu thuật nha",
      description: "Nhổ răng khôn, cấy ghép implant",
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "Tẩy trắng răng",
      description: "Làm trắng răng an toàn, hiệu quả",
    },
  ];

  const testimonials = [
    {
      content:
        "Tôi rất hài lòng khi đưa con đến Smart Dental. Đội ngũ bác sĩ rất tận tâm và chuyên nghiệp. Con tôi không còn sợ đi khám răng nữa. Cơ sở vật chất hiện đại, sạch sẽ và nhân viên rất thân thiện.",
      author: "Nguyễn Văn Minh",
      role: "Phụ huynh bệnh nhân",
      image: Testimonial1,
      rating: 5,
    },
    {
      content:
        "Sau khi niềng răng tại Smart Dental, nụ cười của tôi đã thay đổi hoàn toàn. Bác sĩ rất tận tình theo dõi và hướng dẫn trong suốt quá trình điều trị. Tôi rất biết ơn đội ngũ y bác sĩ tại đây.",
      author: "Trần Thị Hương",
      role: "Bệnh nhân chỉnh nha",
      image: Testimonial2,
      rating: 5,
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Đặt lịch hẹn",
      description:
        "Đặt lịch khám trực tuyến dễ dàng qua website hoặc ứng dụng. Chọn bác sĩ và thời gian phù hợp với bạn.",
      align: "right",
    },
    {
      step: 2,
      title: "Đến phòng khám",
      description: "Đến đúng giờ hẹn, nhân viên sẽ hướng dẫn bạn làm thủ tục và chuẩn bị cho buổi khám.",
      align: "left",
    },
    {
      step: 3,
      title: "Gặp bác sĩ chuyên khoa",
      description: "Bác sĩ sẽ thăm khám, tư vấn và đưa ra phác đồ điều trị phù hợp với tình trạng của bạn.",
      align: "right",
    },
    {
      step: 4,
      title: "Theo dõi sau điều trị",
      description: "Nhận hướng dẫn chăm sóc tại nhà và lịch tái khám để đảm bảo kết quả điều trị tốt nhất.",
      align: "left",
    },
    {
      step: 5,
      title: "Thanh toán linh hoạt",
      description: "Thanh toán dễ dàng qua nhiều hình thức: tiền mặt, thẻ, ví điện tử hoặc trả góp 0%.",
      align: "right",
    },
  ];

  const blogPosts = [
    {
      image: Blog1,
      title: "Hướng dẫn chăm sóc răng miệng đúng cách",
      category: "Sức khỏe răng miệng",
    },
    {
      image: Blog2,
      title: "Tầm quan trọng của khám răng định kỳ",
      category: "Khám định kỳ",
    },
    {
      image: Blog3,
      title: "Những điều cần biết về niềng răng",
      category: "Chỉnh nha",
    },
  ];

  const faqs = [
    {
      question: "Smart Dental cung cấp những dịch vụ gì?",
      answer:
        "Chúng tôi cung cấp đầy đủ các dịch vụ nha khoa từ khám tổng quát, chỉnh nha, nha khoa thẩm mỹ, cấy ghép implant, đến nha khoa trẻ em. Tất cả được thực hiện bởi đội ngũ bác sĩ giàu kinh nghiệm với trang thiết bị hiện đại.",
    },
    {
      question: "Làm thế nào để đặt lịch hẹn với Smart Dental?",
      answer:
        "Bạn có thể đặt lịch trực tuyến qua website, ứng dụng di động hoặc gọi điện đến hotline 1900 1234. Hệ thống sẽ tự động nhắc nhở bạn trước giờ hẹn.",
    },
    {
      question: "Smart Dental có nhận bảo hiểm không?",
      answer:
        "Có, chúng tôi liên kết với hầu hết các công ty bảo hiểm lớn tại Việt Nam. Bạn có thể thanh toán trực tiếp bằng bảo hiểm hoặc nhận hoàn tiền sau điều trị.",
    },
    {
      question: "Thời gian khám bệnh mất bao lâu?",
      answer:
        "Thời gian khám tổng quát thường từ 30-45 phút. Đối với các điều trị chuyên sâu, bác sĩ sẽ tư vấn cụ thể thời gian dựa trên tình trạng của bạn.",
    },
    {
      question: "Làm sao để theo dõi lịch sử khám bệnh?",
      answer:
        "Bạn có thể đăng nhập vào tài khoản trên website hoặc ứng dụng để xem toàn bộ lịch sử khám, đơn thuốc, hình ảnh X-quang và các kết quả xét nghiệm.",
    },
  ];

  const partners = [
    { name: "Medical Plus", logo: "MEDICAL+" },
    { name: "DrugStore", logo: "DrugStore" },
    { name: "Medical Lab", logo: "MEDICAL" },
    { name: "Hospital Care", logo: "Hospital" },
    { name: "Pharmacy", logo: "PHARMACY" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Hero Section - negative margin to go under header */}
      <section className="relative min-h-screen overflow-hidden -mt-[72px] pt-[72px]">
        {/* Background Image - Full Cover */}
        <div className="absolute inset-0">
          <Image src={HeroImage} alt="Background" fill className="object-cover object-center" priority />
        </div>

        {/* Floating Card - Top Right */}
        <div className="absolute top-28 right-8 lg:right-20 z-20 hidden lg:flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-full py-2 px-4 shadow-lg">
          <div className="flex -space-x-2">
            <Image
              src={Testimonial1}
              alt="Avatar 1"
              width={40}
              height={40}
              className="rounded-full border-2 border-white object-contain"
            />
            <Image
              src={Testimonial2}
              alt="Avatar 2"
              width={40}
              height={40}
              className="rounded-full border-2 border-white object-contain"
            />
            <Image
              src={Testimonial3}
              alt="Avatar 3"
              width={40}
              height={40}
              className="rounded-full border-2 border-white object-contain"
            />
          </div>
          <div>
            <p className="font-bold text-gray-900">150K +</p>
            <p className="text-xs text-gray-500">Bệnh nhân tin tưởng</p>
          </div>
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
          <div className="max-w-2xl">
            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-8 italic">
              <span className="text-primary">Chăm sóc tận tâm,</span>
              <br />
              <span className="text-primary">kết quả vượt trội.</span>
            </h1>

            {/* Description */}
            <div className="flex items-start gap-6 mb-8">
              <div className="hidden sm:block">
                <p className="text-white font-medium border-l-2 border-white/70 pl-4 drop-shadow-md">Smart Dental</p>
              </div>
              <p className="text-white/90 max-w-md leading-relaxed drop-shadow-md">
                Đội ngũ bác sĩ giàu kinh nghiệm của chúng tôi cam kết mang đến dịch vụ chăm sóc chất lượng và sự quan
                tâm cá nhân hóa cho từng bệnh nhân.
              </p>
            </div>

            {/* CTA Button */}
            <div className="flex items-center gap-4">
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-3 text-white hover:text-white/80 transition-colors group"
              >
                <div className="w-14 h-14 rounded-full border-2 border-white bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="font-medium drop-shadow-md">Xem cách hoạt động</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Bar - Bottom Right */}
        <div className="absolute bottom-8 right-0 z-10">
          <div className="flex">
            <div className="bg-white/95 backdrop-blur-md rounded-l-2xl shadow-xl overflow-hidden">
              <div className="flex divide-x divide-gray-200">
                {stats.map((stat, index) => (
                  <div key={index} className="px-6 lg:px-8 py-6 text-center">
                    <div className="text-2xl lg:text-3xl xl:text-4xl font-bold text-primary mb-1">{stat.number}</div>
                    <div className="text-xs lg:text-sm text-gray-600 whitespace-nowrap">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Image */}
            <div className="relative">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden">
                <Image src={AboutTeam} alt="Đội ngũ bác sĩ" fill className="object-cover" />
              </div>
              {/* Decorative elements */}
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary/10 rounded-3xl -z-10" />
              <div className="absolute top-6 -left-6 w-24 h-24 bg-primary/20 rounded-2xl -z-10" />
            </div>

            {/* Right Content */}
            <div>
              <p className="text-primary font-medium mb-2 tracking-wide">VỀ CHÚNG TÔI</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Smart Dental là đội ngũ
                <br />
                <span className="text-primary">chuyên gia y tế hàng đầu</span>
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Với hơn 20 năm kinh nghiệm trong lĩnh vực nha khoa, Smart Dental tự hào là địa chỉ tin cậy của hàng
                nghìn bệnh nhân. Chúng tôi cam kết mang đến dịch vụ chăm sóc răng miệng toàn diện với công nghệ tiên
                tiến nhất.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Đội ngũ bác sĩ của chúng tôi được đào tạo bài bản tại các trường đại học y khoa hàng đầu, thường xuyên
                cập nhật kiến thức và kỹ thuật mới nhất trong ngành nha khoa thế giới.
              </p>
              <Link href="#doctors" className="inline-flex items-center text-primary font-semibold hover:underline">
                Tìm hiểu thêm
                <ChevronRight className="w-5 h-5 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section id="services" className="py-20 bg-[#f8fbff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-primary font-medium mb-2 tracking-wide">CHUYÊN KHOA</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Vì sức khỏe răng miệng của bạn</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 ring-1 ring-primary hover:bg-primary hover:ring-primary transition-all duration-300 group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-white group-hover:bg-white/20 group-hover:text-white transition-colors">
                    {dept.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-white transition-colors">
                      {dept.title}
                    </h3>
                    <p className="text-gray-600 text-sm group-hover:text-white/80 transition-colors">
                      {dept.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-linear-to-br from-[#e8f4fd] to-[#f0f7ff] relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-20 h-20 border-2 border-primary/20 rounded-full" />
          <div className="absolute bottom-20 right-20 w-32 h-32 border-2 border-primary/20 rounded-full" />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-primary/10 rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12">
            <div>
              <p className="text-primary font-medium mb-2 tracking-wide">ĐÁNH GIÁ</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Bệnh nhân nói gì
                <br />
                về chúng tôi
              </h2>
            </div>
            <div className="flex gap-2 mt-6 lg:mt-0">
              <button
                onClick={() => setActiveTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1))}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 shadow-sm transition-all duration-300 ${
                  activeTestimonial === index ? "ring-2 ring-primary" : ""
                }`}
              >
                <Quote className="w-10 h-10 text-primary/30 mb-4" />
                <p className="text-gray-700 mb-6 leading-relaxed">{testimonial.content}</p>
                <div className="flex items-center gap-4">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.author}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />

                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                  <div className="ml-auto flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-[#1e3a5f]">Cách thức hoạt động</h2>
          </div>

          <div className="relative">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative group">
                {/* Grid layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-0 items-center">
                  {/* Left Column */}
                  <div
                    className={`${item.align === "right" ? "lg:order-1" : "lg:order-3"} flex ${
                      item.align === "right" ? "lg:justify-end" : "lg:justify-start"
                    }`}
                  >
                    {item.align === "right" ? (
                      /* Icon + small dot on left */
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full border-2 border-[#00a6f4]/30 group-hover:bg-[#00a6f4] group-hover:border-[#00a6f4] transition-all duration-300 hidden lg:block" />
                        <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-gray-100 group-hover:bg-[#00a6f4] flex items-center justify-center transition-all duration-500">
                          <div className="text-[#00a6f4]/40 group-hover:text-white group-hover:bg-[#00a6f4] transition-colors duration-500">
                            {item.step === 1 && <Calendar className="w-10 h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />}
                            {item.step === 2 && <MapPin className="w-10 h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />}
                            {item.step === 3 && <Stethoscope className="w-10 h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />}
                            {item.step === 4 && <FileCheck className="w-10 h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />}
                            {item.step === 5 && <CreditCard className="w-10 h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Content on left */
                      <div className="text-left lg:text-right lg:pr-8">
                        <div className="flex items-baseline gap-3 mb-2 lg:justify-end">
                          <h3 className="text-xl lg:text-2xl font-bold text-[#1e3a5f] order-1 lg:order-2">
                            {item.title}
                          </h3>
                          <span className="text-5xl lg:text-7xl font-bold text-gray-200/80 order-2 lg:order-1">
                            0{item.step}
                          </span>
                        </div>
                        <p className="text-gray-500 leading-relaxed max-w-sm lg:ml-auto">{item.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Center Timeline */}
                  <div className="hidden lg:flex flex-col items-center lg:order-2 self-stretch py-4 mx-20">
                    {/* Line segment - changes color on hover */}
                    <div className="w-1 flex-1 bg-gray-200 group-hover:bg-[#00a6f4] transition-colors duration-500 rounded-full" />
                  </div>

                  {/* Right Column */}
                  <div
                    className={`${item.align === "right" ? "lg:order-3" : "lg:order-1"} flex ${
                      item.align === "right" ? "lg:justify-start" : "lg:justify-end"
                    }`}
                  >
                    {item.align === "right" ? (
                      /* Content on right */
                      <div className="text-left lg:pl-8">
                        <div className="flex items-baseline gap-3 mb-2">
                          <span className="text-5xl lg:text-7xl font-bold text-gray-200/80">0{item.step}</span>
                          <h3 className="text-xl lg:text-2xl font-bold text-[#1e3a5f]">{item.title}</h3>
                        </div>
                        <p className="text-gray-500 leading-relaxed max-w-sm">{item.description}</p>
                      </div>
                    ) : (
                      /* Icon + small dot on right */
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-gray-100 group-hover:bg-[#00a6f4] flex items-center justify-center transition-all duration-500">
                          <div className="text-[#00a6f4]/40 group-hover:text-white transition-colors duration-500">
                            {item.step === 1 && <Calendar className="w-10 h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />}
                            {item.step === 2 && <MapPin className="w-10 h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />}
                            {item.step === 3 && <Stethoscope className="w-10 h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />}
                            {item.step === 4 && <FileCheck className="w-10 h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />}
                            {item.step === 5 && <CreditCard className="w-10 h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />}
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-full border-2 border-[#00a6f4]/30 group-hover:bg-[#00a6f4] group-hover:border-primary transition-all duration-300 hidden lg:block" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Spacing */}
                <div className="h-8 lg:h-12" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section
        className="py-20 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%)",
        }}
      >
        {/* Hexagon pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse">
              <polygon
                points="24.8,22 37.3,29.2 37.3,43.7 24.8,50.9 12.3,43.7 12.3,29.2"
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#hexagons)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Đừng để sức khỏe răng miệng
            <br />
            bị lãng quên!
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Đặt lịch khám ngay hôm nay để được tư vấn miễn phí và nhận ưu đãi đặc biệt từ Smart Dental
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Đặt lịch ngay
            <ChevronRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Blog Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-primary font-medium mb-2 tracking-wide">TIN TỨC</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Cập nhật mới nhất</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <div key={index} className="group cursor-pointer">
                <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-gray-100 mb-4">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <span className="text-sm text-primary font-medium">{post.category}</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-[#f8fbff]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-primary font-medium mb-2 tracking-wide">CÂU HỎI THƯỜNG GẶP</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Giải đáp thắc mắc</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${activeFaq === index ? "rotate-180" : ""}`}
                  />
                </button>
                {activeFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-12">
            {partners.map((partner, index) => (
              <div key={index} className="text-2xl font-bold text-gray-300 hover:text-gray-400 transition-colors">
                {partner.logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Đăng ký nhận tin</h3>
              <p className="text-gray-400">Nhận thông tin ưu đãi và kiến thức chăm sóc răng miệng</p>
            </div>
            <div className="flex gap-4 w-full lg:w-auto">
              <input
                type="email"
                placeholder="Email của bạn"
                className="flex-1 lg:w-80 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <button className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2">
                <Send className="w-5 h-5" />
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-linear-to-br from-blue-100 to-[#00a6f4]">
                  <Image src={tooth} alt="Logo" width={24} height={24} />
                </div>
                <span className="text-xl font-bold">Smart Dental</span>
              </div>
              <p className="text-gray-400 mb-6">
                Hệ thống nha khoa thông minh hàng đầu Việt Nam, cam kết mang đến nụ cười hoàn hảo cho bạn.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-400">
                  <Phone className="w-5 h-5 text-primary" />
                  <span>1900 1234</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <Mail className="w-5 h-5 text-primary" />
                  <span>info@smartdental.vn</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>TP. Hồ Chí Minh, Việt Nam</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Liên kết nhanh</h4>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link href="#about" className="hover:text-primary transition-colors">
                    Về chúng tôi
                  </Link>
                </li>
                <li>
                  <Link href="#services" className="hover:text-primary transition-colors">
                    Dịch vụ
                  </Link>
                </li>
                <li>
                  <Link href="#doctors" className="hover:text-primary transition-colors">
                    Đội ngũ bác sĩ
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:text-primary transition-colors">
                    Đặt lịch khám
                  </Link>
                </li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Dịch vụ</h4>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <span className="hover:text-primary transition-colors cursor-pointer">Khám tổng quát</span>
                </li>
                <li>
                  <span className="hover:text-primary transition-colors cursor-pointer">Tẩy trắng răng</span>
                </li>
                <li>
                  <span className="hover:text-primary transition-colors cursor-pointer">Chỉnh nha</span>
                </li>
                <li>
                  <span className="hover:text-primary transition-colors cursor-pointer">Cấy ghép Implant</span>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Hỗ trợ</h4>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <span className="hover:text-primary transition-colors cursor-pointer">Câu hỏi thường gặp</span>
                </li>
                <li>
                  <span className="hover:text-primary transition-colors cursor-pointer">Chính sách bảo mật</span>
                </li>
                <li>
                  <span className="hover:text-primary transition-colors cursor-pointer">Điều khoản sử dụng</span>
                </li>
                <li>
                  <span className="hover:text-primary transition-colors cursor-pointer">Liên hệ hỗ trợ</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500">
            <p>&copy; 2024 Smart Dental Healthcare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
