import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  Clock,
  CalendarDays,
  Check,
  X,
  Phone,
  MapPin,
  ChevronRight,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";

/* ──────────────────────── Real clinic data ──────────────────────── */

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  room: string;
  photo?: string;
  experience: number;
  rating: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DaySchedule {
  date: string;
  label: string;
  dayOfWeek: string;
  slots: TimeSlot[];
}

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  room: string;
  createdAt: string;
}

const DOCTORS: Doctor[] = [
  { id: "d1", name: "Хасанова Марьям Ахмедовна", specialty: "Терапевт", room: "каб. 102", experience: 12, rating: 4.8 },
  { id: "d2", name: "Магомадов Ислам Русланович", specialty: "Хирург", room: "каб. 205", experience: 8, rating: 4.7 },
  { id: "d3", name: "Эльмурзаева Хеда Саидовна", specialty: "Офтальмолог", room: "каб. 108", experience: 15, rating: 4.9 },
  { id: "d4", name: "Дудаев Адам Магомедович", specialty: "Стоматолог", room: "каб. 301", experience: 6, rating: 4.6 },
  { id: "d5", name: "Ибрагимова Аминат Шамильевна", specialty: "Невролог", room: "каб. 110", experience: 10, rating: 4.8 },
  { id: "d6", name: "Кадыров Шамиль Алиевич", specialty: "ЛОР", room: "каб. 203", experience: 9, rating: 4.5 },
  { id: "d7", name: "Висаитова Зулай Ахмедовна", specialty: "Дерматолог", room: "каб. 115", experience: 7, rating: 4.7 },
  { id: "d8", name: "Абдулкеримов Руслан Магомедович", specialty: "Психотерапевт", room: "каб. 312", experience: 11, rating: 4.9 },
];

function generateSchedule(): DaySchedule[] {
  const days: DaySchedule[] = [];
  const now = new Date();
  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const monthNames = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue; // skip sunday

    const slots: TimeSlot[] = [];
    const startH = 8;
    const endH = d.getDay() === 6 ? 14 : 17; // saturday short day
    for (let h = startH; h < endH; h++) {
      for (const m of [0, 30]) {
        // pseudo-random availability based on date+time
        const seed = d.getDate() * 100 + h * 10 + m;
        const available = seed % 3 !== 0;
        slots.push({
          time: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
          available,
        });
      }
    }

    days.push({
      date: d.toISOString().split("T")[0],
      label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
      dayOfWeek: dayNames[d.getDay()],
      slots,
    });
  }

  return days;
}

const SCHEDULE = generateSchedule();

/* ──────────────────────── Component ──────────────────────── */

export default function ClinicBookingPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(SCHEDULE[0]?.date ?? "");
  const [confirmSlot, setConfirmSlot] = useState<{ doctor: Doctor; date: string; time: string; dayLabel: string } | null>(null);
  const [filterSpecialty, setFilterSpecialty] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem("sc:clinic");
    return saved ? JSON.parse(saved) : [];
  });

  const specialties = useMemo(() => [...new Set(DOCTORS.map((d: Doctor) => d.specialty))].sort(), []);

  const filteredDoctors = useMemo(
    () => filterSpecialty ? DOCTORS.filter((d: Doctor) => d.specialty === filterSpecialty) : DOCTORS,
    [filterSpecialty],
  );

  const currentDaySchedule = SCHEDULE.find((s: DaySchedule) => s.date === selectedDay);

  const bookAppointment = (doctor: Doctor, date: string, time: string) => {
    const dayInfo = SCHEDULE.find((s: DaySchedule) => s.date === date);
    const appt: Appointment = {
      id: `appt-${Date.now()}`,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      date,
      time,
      room: doctor.room,
      createdAt: new Date().toISOString(),
    };
    const updated = [...appointments, appt];
    setAppointments(updated);
    localStorage.setItem("sc:clinic", JSON.stringify(updated));
    setConfirmSlot(null);
    setSelectedDoctor(null);
    toast.success(`Записаны к ${doctor.specialty.toLowerCase()}у на ${dayInfo?.label ?? date} в ${time}`);
  };

  const cancelAppointment = (id: string) => {
    const updated = appointments.filter((a: Appointment) => a.id !== id);
    setAppointments(updated);
    localStorage.setItem("sc:clinic", JSON.stringify(updated));
    toast.info("Запись отменена");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Здоровье"
        title="Поликлиника ГГНТУ"
        subtitle="Онлайн-запись к врачам университетской поликлиники. Приём бесплатный для студентов."
      />

      {/* Clinic info */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          <div className="flex items-center gap-3 text-sm text-muted">
            <MapPin className="h-4 w-4 text-burgundy shrink-0" />
            <span>пр. Х. Исаева, 62, корпус Г (мед. пункт)</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <Clock className="h-4 w-4 text-burgundy shrink-0" />
            <span>Пн–Пт: 8:00–17:00, Сб: 8:00–14:00</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <Phone className="h-4 w-4 text-burgundy shrink-0" />
            <span>+7 (871-2) 22-36-09</span>
          </div>
        </div>
      </Card>

      {/* My appointments */}
      {appointments.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 bg-burgundy/5 border-b border-burgundy/10">
            <h3 className="font-semibold text-navy text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-burgundy" />
              Мои записи
            </h3>
          </div>
          <div className="divide-y divide-border/30">
            {appointments.map((a: Appointment) => {
              const dayInfo = SCHEDULE.find((s: DaySchedule) => s.date === a.date);
              return (
                <div key={a.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-burgundy/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="h-4 w-4 text-burgundy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-navy">{a.specialty} — {a.doctorName}</div>
                    <div className="text-xs text-muted">
                      {dayInfo?.label ?? a.date}, {a.time} · {a.room}
                    </div>
                  </div>
                  <button
                    onClick={() => cancelAppointment(a.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-red-400 transition-colors"
                    title="Отменить запись"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Specialty filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterSpecialty("")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            !filterSpecialty ? "bg-burgundy text-white" : "bg-gray-100 text-muted hover:bg-gray-200",
          )}
        >
          Все врачи
        </button>
        {specialties.map((s: string) => (
          <button
            key={s}
            onClick={() => setFilterSpecialty(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filterSpecialty === s ? "bg-burgundy text-white" : "bg-gray-100 text-muted hover:bg-gray-200",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Doctors list */}
      <div className="grid md:grid-cols-2 gap-3">
        {filteredDoctors.map((doc: Doctor) => (
          <Card
            key={doc.id}
            className={cn(
              "p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-hover",
              selectedDoctor?.id === doc.id && "ring-2 ring-burgundy/40",
            )}
            onClick={() => setSelectedDoctor(selectedDoctor?.id === doc.id ? null : doc)}
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-navy/5 flex items-center justify-center shrink-0">
                <User className="h-6 w-6 text-navy/40" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-navy text-sm">{doc.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="success">{doc.specialty}</Badge>
                  <span className="text-xs text-muted">{doc.room}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                  <span>Стаж: {doc.experience} лет</span>
                  <span>★ {doc.rating}</span>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted transition-transform mt-1",
                  selectedDoctor?.id === doc.id && "rotate-90",
                )}
              />
            </div>

            {/* Schedule picker */}
            <AnimatePresence>
              {selectedDoctor?.id === doc.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <div className="mt-4 pt-4 border-t border-border/40">
                    {/* Day tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {SCHEDULE.map((day: DaySchedule) => (
                        <button
                          key={day.date}
                          onClick={() => setSelectedDay(day.date)}
                          className={cn(
                            "flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0",
                            selectedDay === day.date
                              ? "bg-burgundy text-white"
                              : "bg-gray-50 text-muted hover:bg-gray-100",
                          )}
                        >
                          <span className="text-[10px] uppercase">{day.dayOfWeek}</span>
                          <span className="mt-0.5">{day.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Time slots */}
                    {currentDaySchedule && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {currentDaySchedule.slots.map((slot: TimeSlot) => {
                          const isBooked = appointments.some(
                            (a: Appointment) => a.date === selectedDay && a.time === slot.time && a.doctorName === doc.name,
                          );
                          return (
                            <button
                              key={slot.time}
                              disabled={!slot.available || isBooked}
                              onClick={() =>
                                setConfirmSlot({
                                  doctor: doc,
                                  date: selectedDay,
                                  time: slot.time,
                                  dayLabel: currentDaySchedule.label,
                                })
                              }
                              className={cn(
                                "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                                isBooked
                                  ? "bg-burgundy/10 text-burgundy cursor-default"
                                  : slot.available
                                    ? "bg-gray-50 text-navy hover:bg-burgundy hover:text-white"
                                    : "bg-gray-50 text-gray-300 cursor-not-allowed",
                              )}
                            >
                              {slot.time}
                              {isBooked && " ✓"}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-[11px] text-muted mt-2">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Серые слоты заняты. Нажмите на свободное время для записи.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setConfirmSlot(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl text-navy">Подтвердите запись</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Врач</span>
                  <span className="font-medium text-navy">{confirmSlot.doctor.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Специальность</span>
                  <span className="font-medium text-navy">{confirmSlot.doctor.specialty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Дата</span>
                  <span className="font-medium text-navy">{confirmSlot.dayLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Время</span>
                  <span className="font-medium text-navy">{confirmSlot.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Кабинет</span>
                  <span className="font-medium text-navy">{confirmSlot.doctor.room}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setConfirmSlot(null)}>
                  <X className="h-4 w-4 mr-1" /> Отмена
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => bookAppointment(confirmSlot.doctor, confirmSlot.date, confirmSlot.time)}
                >
                  <Check className="h-4 w-4 mr-1" /> Записаться
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
