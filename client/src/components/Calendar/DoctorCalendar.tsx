"use client";

import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./DoctorCalendar.css";

// Set Vietnamese locale
moment.locale("vi", {
  months: "Tháng 1_Tháng 2_Tháng 3_Tháng 4_Tháng 5_Tháng 6_Tháng 7_Tháng 8_Tháng 9_Tháng 10_Tháng 11_Tháng 12".split(
    "_"
  ),
  monthsShort: "Th01_Th02_Th03_Th04_Th05_Th06_Th07_Th08_Th09_Th10_Th11_Th12".split("_"),
  weekdays: "Chủ Nhật_Thứ Hai_Thứ Ba_Thứ Tư_Thứ Năm_Thứ Sáu_Thứ Bảy".split("_"),
  weekdaysShort: "CN_T2_T3_T4_T5_T6_T7".split("_"),
  weekdaysMin: "CN_T2_T3_T4_T5_T6_T7".split("_"),
});

const localizer = momentLocalizer(moment);

interface Appointment {
  id: string;
  patientName: string;
  patientAvatar?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  visitType?: string;
  reason?: string;
  gender?: string;
  location?: string;
  email?: string;
  phone?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
}

interface SlotInfo {
  start: Date;
  end: Date;
  action: string;
  slots?: Date[];
}

interface Props {
  appointments: Appointment[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot?: (slotInfo: SlotInfo) => void;
  view?: View;
  onViewChange?: (view: View) => void;
}

export default function DoctorCalendar({
  appointments,
  onSelectEvent,
  onSelectSlot,
  view = "week",
  onViewChange,
}: Props) {
  const events: CalendarEvent[] = appointments.map((apt) => ({
    id: apt.id,
    title: apt.patientName,
    start: new Date(`${apt.date}T${apt.startTime}`),
    end: new Date(`${apt.date}T${apt.endTime}`),
    resource: apt,
  }));

  const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource.status;
    const visitType = event.resource.visitType;
    let backgroundColor = "#00a6f4"; // Primary color
    let borderColor = "#00a6f4";
    let className = "event-confirmed";

    // Color based on status - Increased opacity to 25% for better visibility
    switch (status) {
      case "confirmed":
        backgroundColor = "rgba(34, 197, 94, 0.25)"; // Green with 25% opacity
        borderColor = "#22c55e";
        className = "event-confirmed";
        break;
      case "pending":
        backgroundColor = "rgba(245, 158, 11, 0.25)"; // Yellow with 25% opacity
        borderColor = "#f59e0b";
        className = "event-pending";
        break;
      case "completed":
        backgroundColor = "rgba(0, 166, 244, 0.25)"; // Primary color with 25% opacity
        borderColor = "#00a6f4";
        className = "event-completed";
        break;
      case "cancelled":
        backgroundColor = "rgba(239, 68, 68, 0.25)"; // Red with 25% opacity
        borderColor = "#ef4444";
        className = "event-cancelled";
        break;
    }

    // Purple for Home Visit
    if (visitType === "Home Visit") {
      backgroundColor = "rgba(139, 92, 246, 0.25)"; // Purple with 25% opacity
      borderColor = "#8b5cf6";
      className = "event-home-visit";
    }

    return {
      className,
      style: {
        backgroundColor,
        borderLeft: `4px solid ${borderColor}`,
        borderTop: "none",
        borderRight: "none",
        borderBottom: "none",
        opacity: status === "cancelled" ? 0.6 : 1,
        color: "#1e293b",
      },
    };
  };

  // Custom event component to display time below name
  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    return (
      <div className="custom-event-content">
        <div className="event-title">{event.title}</div>
        <div className="event-time">
          {event.resource.startTime} - {event.resource.endTime}
        </div>
      </div>
    );
  };

  return (
    <div className="doctor-calendar-wrapper">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "calc(100vh - 250px)", minHeight: "600px" }}
        defaultView={view}
        view={view}
        onView={onViewChange}
        views={["month", "week", "day", "agenda"]}
        step={30}
        showMultiDayTimes
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        components={{
          event: CustomEvent,
        }}
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
          event: "Lịch hẹn",
          noEventsInRange: "Không có lịch hẹn nào trong khoảng thời gian này.",
          showMore: (total) => `+${total} lịch hẹn nữa`,
        }}
        formats={{
          dayHeaderFormat: (date: Date) => moment(date).format("dddd DD/MM"),
          dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${moment(start).format("DD/MM/YYYY")} - ${moment(end).format("DD/MM/YYYY")}`,
          agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${moment(start).format("DD/MM")} - ${moment(end).format("DD/MM/YYYY")}`,
          timeGutterFormat: (date: Date) => moment(date).format("HH:mm"),
          monthHeaderFormat: (date: Date) => moment(date).format("MMMM YYYY"),
          weekdayFormat: (date: Date) => moment(date).format("ddd"),
          dayFormat: (date: Date) => moment(date).format("DD ddd"),
          agendaDateFormat: (date: Date) => moment(date).format("DD/MM"),
          agendaTimeFormat: (date: Date) => moment(date).format("HH:mm"),
          agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
        }}
        min={new Date(2025, 0, 1, 7, 0, 0)} // 7 AM
        max={new Date(2025, 0, 1, 20, 0, 0)} // 8 PM
      />
    </div>
  );
}
