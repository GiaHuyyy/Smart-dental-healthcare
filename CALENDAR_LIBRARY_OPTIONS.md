# Calendar Library Options for Doctor Schedule

## Hiện Trạng

Hiện tại đang dùng **custom implementation** với vanilla React. Có ưu điểm là:

- ✅ Kiểm soát hoàn toàn
- ✅ Không phụ thuộc external library
- ✅ Customize dễ dàng
- ❌ Tốn thời gian maintain
- ❌ Thiếu features nâng cao (drag-drop, resize, recurring events)

## 📚 Thư Viện Nên Dùng

### 1. **FullCalendar** ⭐⭐⭐⭐⭐

**Best choice cho production healthcare apps**

```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

**Pros**:

- ✅ Rất mature (10+ years)
- ✅ Week/Month/Day views sẵn
- ✅ Drag & drop appointments
- ✅ Resize events
- ✅ Recurring events
- ✅ Resource scheduling (multi-doctor)
- ✅ Mobile responsive
- ✅ Timezone support
- ✅ Export to PDF/iCal
- ✅ Documentation tốt

**Cons**:

- ⚠️ Bundle size lớn (~200KB)
- ⚠️ Premium features trả phí ($199/year)
- ⚠️ Phức tạp để setup ban đầu

**Example**:

```tsx
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

<FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
  initialView="timeGridWeek"
  headerToolbar={{
    left: "prev,next today",
    center: "title",
    right: "dayGridMonth,timeGridWeek,timeGridDay",
  }}
  events={appointments.map((apt) => ({
    id: apt.id,
    title: apt.patientName,
    start: `${apt.date}T${apt.startTime}`,
    end: `${apt.date}T${apt.endTime}`,
    backgroundColor: getColor(apt.status),
  }))}
  editable={true}
  selectable={true}
  eventClick={handleEventClick}
  eventDrop={handleEventDrop}
  eventResize={handleEventResize}
/>;
```

**Demo**: https://fullcalendar.io/demos

---

### 2. **React Big Calendar** ⭐⭐⭐⭐

**Best choice cho open-source, miễn phí**

```bash
npm install react-big-calendar moment
```

**Pros**:

- ✅ Hoàn toàn miễn phí
- ✅ Bundle size nhỏ (~50KB)
- ✅ Dễ customize
- ✅ Week/Month/Day/Agenda views
- ✅ Drag & drop (với plugin)
- ✅ Active community
- ✅ TypeScript support

**Cons**:

- ⚠️ Ít features hơn FullCalendar
- ⚠️ Styling cần nhiều custom CSS
- ⚠️ Documentation không chi tiết lắm

**Example**:

```tsx
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

<Calendar
  localizer={localizer}
  events={appointments.map((apt) => ({
    id: apt.id,
    title: apt.patientName,
    start: new Date(`${apt.date}T${apt.startTime}`),
    end: new Date(`${apt.date}T${apt.endTime}`),
    resource: apt,
  }))}
  startAccessor="start"
  endAccessor="end"
  views={["month", "week", "day", "agenda"]}
  defaultView="week"
  style={{ height: 700 }}
  onSelectEvent={handleSelectEvent}
  onSelectSlot={handleSelectSlot}
  selectable
/>;
```

**Demo**: https://jquense.github.io/react-big-calendar/examples/

---

### 3. **React Calendar Timeline** ⭐⭐⭐

**Best cho timeline horizontal view**

```bash
npm install react-calendar-timeline moment
```

**Pros**:

- ✅ Timeline view đẹp
- ✅ Zoom in/out
- ✅ Multi-resource (nhiều bác sĩ)
- ✅ Performance tốt với data lớn

**Cons**:

- ⚠️ Chỉ có timeline view
- ⚠️ Không có month/week grid view

**Use case**: Khi muốn xem nhiều bác sĩ cùng lúc (resource scheduling)

---

### 4. **TUI Calendar** ⭐⭐⭐⭐

**Korean library, rất đẹp**

```bash
npm install @toast-ui/react-calendar
```

**Pros**:

- ✅ UI/UX đẹp, modern
- ✅ Miễn phí
- ✅ Week/Month/Day views
- ✅ Drag & drop
- ✅ Mobile responsive

**Cons**:

- ⚠️ Documentation tiếng Hàn/Anh lẫn lộn
- ⚠️ Community nhỏ hơn

---

## 🎯 Recommendation

### Cho dự án này, tôi recommend:

#### **Option 1: React Big Calendar** (FREE, dễ dùng)

```bash
npm install react-big-calendar moment
npm install --save-dev @types/react-big-calendar
```

**Lý do**:

- Miễn phí hoàn toàn
- Đủ features cho healthcare scheduling
- Dễ integrate với existing code
- TypeScript support
- Active maintenance

#### **Option 2: FullCalendar** (PRO, nhiều tính năng)

Nếu cần:

- Recurring appointments (lặp lịch)
- Multi-doctor resource scheduling
- Advanced drag & drop
- Premium support

---

## 🔧 Migration Plan

### Bước 1: Cài đặt React Big Calendar

```bash
cd client
npm install react-big-calendar moment
npm install --save-dev @types/react-big-calendar
```

### Bước 2: Tạo wrapper component

**`components/Calendar/DoctorCalendar.tsx`**:

```tsx
"use client";

import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./DoctorCalendar.css"; // Custom styles

moment.locale("vi");
const localizer = momentLocalizer(moment);

interface Appointment {
  id: string;
  patientName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  // ... other fields
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
}

interface Props {
  appointments: Appointment[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: any) => void;
  view?: View;
}

export default function DoctorCalendar({ appointments, onSelectEvent, onSelectSlot, view = "week" }: Props) {
  const events: CalendarEvent[] = appointments.map((apt) => ({
    id: apt.id,
    title: apt.patientName,
    start: new Date(`${apt.date}T${apt.startTime}`),
    end: new Date(`${apt.date}T${apt.endTime}`),
    resource: apt,
  }));

  const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource.status;
    let backgroundColor = "#3174ad";

    switch (status) {
      case "confirmed":
        backgroundColor = "#10b981";
        break;
      case "pending":
        backgroundColor = "#f59e0b";
        break;
      case "completed":
        backgroundColor = "#6366f1";
        break;
      case "cancelled":
        backgroundColor = "#ef4444";
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "8px",
        opacity: 0.9,
        color: "white",
        border: "none",
        display: "block",
        padding: "4px",
      },
    };
  };

  return (
    <Calendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      style={{ height: "calc(100vh - 200px)" }}
      defaultView={view}
      views={["month", "week", "day", "agenda"]}
      step={30}
      showMultiDayTimes
      onSelectEvent={onSelectEvent}
      onSelectSlot={onSelectSlot}
      selectable
      eventPropGetter={eventStyleGetter}
      messages={{
        next: "Sau",
        previous: "Trước",
        today: "Hôm nay",
        month: "Tháng",
        week: "Tuần",
        day: "Ngày",
        agenda: "Lịch trình",
        date: "Ngày",
        time: "Thời gian",
        event: "Sự kiện",
        noEventsInRange: "Không có lịch hẹn nào.",
      }}
      formats={{
        dayHeaderFormat: (date: Date) => moment(date).format("dddd DD/MM"),
        dayRangeHeaderFormat: ({ start, end }) =>
          `${moment(start).format("DD/MM/YYYY")} - ${moment(end).format("DD/MM/YYYY")}`,
        agendaHeaderFormat: ({ start, end }) =>
          `${moment(start).format("DD/MM")} - ${moment(end).format("DD/MM/YYYY")}`,
        timeGutterFormat: (date: Date) => moment(date).format("HH:mm"),
      }}
    />
  );
}
```

### Bước 3: Custom CSS

**`components/Calendar/DoctorCalendar.css`**:

```css
/* Override default styles */
.rbc-calendar {
  font-family: inherit;
}

.rbc-header {
  padding: 12px 4px;
  font-weight: 600;
  background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
  border-bottom: 2px solid #e5e7eb;
}

.rbc-today {
  background-color: #dbeafe !important;
}

.rbc-time-slot {
  min-height: 40px;
}

.rbc-event {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.rbc-event:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.rbc-event-label {
  display: none; /* Hide default time label */
}

.rbc-toolbar {
  padding: 16px 0;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rbc-toolbar button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.rbc-toolbar button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.rbc-toolbar button.rbc-active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.rbc-month-view {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.rbc-time-view {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}
```

### Bước 4: Sử dụng trong page

**`app/doctor/schedule/page.tsx`**:

```tsx
"use client";

import { useState } from "react";
import DoctorCalendar from "@/components/Calendar/DoctorCalendar";
import { AppointmentSocketProvider } from "@/contexts/AppointmentSocketContext";

function DoctorScheduleContent() {
  const [appointments, setAppointments] = useState(SAMPLE_APPOINTMENTS);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleSelectEvent = (event) => {
    setSelectedAppointment(event.resource);
    setDetailModalOpen(true);
  };

  const handleSelectSlot = (slotInfo) => {
    console.log("Selected slot:", slotInfo);
    // Open "New Appointment" modal
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <DoctorCalendar
        appointments={appointments}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        view="week"
      />

      {/* Detail Modal */}
      {detailModalOpen && (
        <AppointmentDetailModal appointment={selectedAppointment} onClose={() => setDetailModalOpen(false)} />
      )}
    </div>
  );
}

export default function DoctorSchedule() {
  return (
    <AppointmentSocketProvider>
      <DoctorScheduleContent />
    </AppointmentSocketProvider>
  );
}
```

---

## 📊 Comparison Table

| Feature              | Custom | React Big Calendar | FullCalendar | TUI Calendar |
| -------------------- | ------ | ------------------ | ------------ | ------------ |
| **Giá**              | Free   | Free               | $199/year    | Free         |
| **Bundle Size**      | ~10KB  | ~50KB              | ~200KB       | ~100KB       |
| **Week View**        | ✅     | ✅                 | ✅           | ✅           |
| **Month View**       | ❌     | ✅                 | ✅           | ✅           |
| **Day View**         | ❌     | ✅                 | ✅           | ✅           |
| **Drag & Drop**      | ❌     | ✅ (plugin)        | ✅           | ✅           |
| **Resize Events**    | ❌     | ✅ (plugin)        | ✅           | ✅           |
| **Recurring Events** | ❌     | ❌                 | ✅ (paid)    | ❌           |
| **Multi-Resource**   | ❌     | ❌                 | ✅ (paid)    | ✅           |
| **Mobile Support**   | ⚠️     | ✅                 | ✅           | ✅           |
| **TypeScript**       | ✅     | ✅                 | ✅           | ⚠️           |
| **Documentation**    | N/A    | ⭐⭐⭐             | ⭐⭐⭐⭐⭐   | ⭐⭐⭐       |
| **Learning Curve**   | Low    | Medium             | High         | Medium       |

---

## 🎯 Final Decision

### Nên dùng: **React Big Calendar**

**Lý do**:

1. **Miễn phí** - Không tốn tiền license
2. **Đủ features** - Week/Month/Day views, drag-drop, selectable
3. **Dễ integrate** - Setup trong 30 phút
4. **TypeScript support** - Type-safe
5. **Active community** - 6k+ stars, frequent updates
6. **Bundle size hợp lý** - ~50KB

### Khi nào nên upgrade lên FullCalendar:

- Cần **recurring appointments** (lịch hẹn lặp lại)
- Cần **multi-doctor scheduling** (nhiều bác sĩ cùng lúc)
- Cần **resource management** nâng cao
- Có budget cho premium features

---

## 🚀 Next Steps

1. **Install React Big Calendar**

   ```bash
   npm install react-big-calendar moment @types/react-big-calendar
   ```

2. **Create wrapper component** (`DoctorCalendar.tsx`)

3. **Add custom styling** (`DoctorCalendar.css`)

4. **Replace current implementation** in `page.tsx`

5. **Test & refine** UI/UX

6. **Integrate with real API** data

7. **Add socket listeners** for real-time updates

---

**Tác giả**: GitHub Copilot
**Ngày**: 10/10/2025
**Dự án**: Smart Dental Healthcare
