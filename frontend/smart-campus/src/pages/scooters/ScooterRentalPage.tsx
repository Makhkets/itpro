import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bike,
  Battery,
  BatteryCharging,
  MapPin,
  Clock,
  Wallet,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  Zap,
  Plus,
  Minus,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";

/* ──────────────────────── Real campus data ──────────────────────── */

interface ScooterStation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  totalSlots: number;
  availableScooters: Scooter[];
}

interface Scooter {
  id: string;
  model: string;
  battery: number;
  rangeKm: number;
  pricePerMin: number;
  unlockFee: number;
}

interface Rental {
  scooterId: string;
  scooterModel: string;
  station: string;
  startedAt: Date;
  pricePerMin: number;
}

const STATIONS: ScooterStation[] = [
  {
    id: "s1",
    name: "ГУК — Главный вход",
    address: "пр. Х. Исаева, 62, Главный учебный корпус",
    lat: 43.3175,
    lng: 45.6945,
    totalSlots: 8,
    availableScooters: [
      { id: "sc-001", model: "Ninebot Max G2", battery: 92, rangeKm: 28, pricePerMin: 5, unlockFee: 50 },
      { id: "sc-002", model: "Xiaomi Pro 4", battery: 78, rangeKm: 22, pricePerMin: 5, unlockFee: 50 },
      { id: "sc-003", model: "Ninebot Max G2", battery: 64, rangeKm: 18, pricePerMin: 5, unlockFee: 50 },
      { id: "sc-004", model: "Kugoo S3 Pro", battery: 45, rangeKm: 12, pricePerMin: 4, unlockFee: 30 },
    ],
  },
  {
    id: "s2",
    name: "Корпус Б — Инженерный",
    address: "пр. Х. Исаева, 62Б, Инженерный корпус",
    lat: 43.3168,
    lng: 45.6955,
    totalSlots: 6,
    availableScooters: [
      { id: "sc-005", model: "Xiaomi Pro 4", battery: 88, rangeKm: 25, pricePerMin: 5, unlockFee: 50 },
      { id: "sc-006", model: "Ninebot Max G2", battery: 55, rangeKm: 15, pricePerMin: 5, unlockFee: 50 },
    ],
  },
  {
    id: "s3",
    name: "Общежитие №1",
    address: "ул. Киевская, 4, Студенческое общежитие",
    lat: 43.3155,
    lng: 45.6930,
    totalSlots: 10,
    availableScooters: [
      { id: "sc-007", model: "Ninebot Max G2", battery: 100, rangeKm: 32, pricePerMin: 5, unlockFee: 50 },
      { id: "sc-008", model: "Kugoo S3 Pro", battery: 95, rangeKm: 28, pricePerMin: 4, unlockFee: 30 },
      { id: "sc-009", model: "Xiaomi Pro 4", battery: 82, rangeKm: 24, pricePerMin: 5, unlockFee: 50 },
      { id: "sc-010", model: "Ninebot Max G2", battery: 71, rangeKm: 20, pricePerMin: 5, unlockFee: 50 },
      { id: "sc-011", model: "Kugoo S3 Pro", battery: 38, rangeKm: 10, pricePerMin: 4, unlockFee: 30 },
    ],
  },
  {
    id: "s4",
    name: "Библиотека ГГНТУ",
    address: "пр. Х. Исаева, 60, Научная библиотека",
    lat: 43.3180,
    lng: 45.6938,
    totalSlots: 4,
    availableScooters: [
      { id: "sc-012", model: "Xiaomi Pro 4", battery: 67, rangeKm: 19, pricePerMin: 5, unlockFee: 50 },
    ],
  },
  {
    id: "s5",
    name: "Спорткомплекс ГГНТУ",
    address: "ул. Киевская, 2, Спортивный комплекс",
    lat: 43.3162,
    lng: 45.6920,
    totalSlots: 6,
    availableScooters: [
      { id: "sc-013", model: "Ninebot Max G2", battery: 90, rangeKm: 27, pricePerMin: 5, unlockFee: 50 },
      { id: "sc-014", model: "Ninebot Max G2", battery: 85, rangeKm: 25, pricePerMin: 5, unlockFee: 50 },
      { id: "sc-015", model: "Kugoo S3 Pro", battery: 60, rangeKm: 16, pricePerMin: 4, unlockFee: 30 },
    ],
  },
];

const RULES = [
  "Используйте шлем при езде",
  "Максимальная скорость на территории кампуса — 15 км/ч",
  "Парковка только на станциях SmartCampus",
  "Запрещена езда вдвоём на одном самокате",
  "При ДТП немедленно позвоните: +7 (871-2) 22-36-09",
];

/* ──────────────────────── Component ──────────────────────── */

const TOP_UP_OPTIONS = [100, 200, 500, 1000];

export default function ScooterRentalPage() {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [rental, setRental] = useState<Rental | null>(() => {
    const saved = localStorage.getItem("sc:rental");
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return { ...parsed, startedAt: new Date(parsed.startedAt) };
  });
  const [confirmScooter, setConfirmScooter] = useState<{ scooter: Scooter; station: ScooterStation } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Balance
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem("sc:balance");
    return saved ? Number(saved) : 0;
  });
  const [showTopUp, setShowTopUp] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const saveBalance = (val: number) => {
    setBalance(val);
    localStorage.setItem("sc:balance", String(val));
  };

  const topUp = (amount: number) => {
    if (amount <= 0) return;
    saveBalance(balance + amount);
    setShowTopUp(false);
    setCustomAmount("");
    toast.success(`Баланс пополнен на ${amount}₽`);
  };

  React.useEffect(() => {
    if (!rental) return;
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - rental.startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [rental]);

  const totalScooters = useMemo(() => STATIONS.reduce((s, st) => s + st.availableScooters.length, 0), []);

  const startRental = (scooter: Scooter, station: ScooterStation) => {
    const minCost = scooter.unlockFee;
    if (balance < minCost) {
      toast.error(`Недостаточно средств. Минимум ${minCost}₽ (разблокировка). Пополните баланс.`);
      setConfirmScooter(null);
      setShowTopUp(true);
      return;
    }
    const r: Rental = {
      scooterId: scooter.id,
      scooterModel: scooter.model,
      station: station.name,
      startedAt: new Date(),
      pricePerMin: scooter.pricePerMin,
    };
    setRental(r);
    localStorage.setItem("sc:rental", JSON.stringify(r));
    setConfirmScooter(null);
    setSelectedStation(null);
    toast.success(`Самокат ${scooter.model} разблокирован! Приятной поездки.`);
  };

  const endRental = () => {
    if (!rental) return;
    const mins = Math.max(1, Math.ceil((Date.now() - rental.startedAt.getTime()) / 60000));
    const cost = 50 + mins * rental.pricePerMin;
    const newBalance = Math.max(0, balance - cost);
    saveBalance(newBalance);
    setRental(null);
    localStorage.removeItem("sc:rental");
    setElapsed(0);
    toast.success(`Поездка завершена! ${mins} мин — списано ${cost}₽. Баланс: ${newBalance}₽`);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Кампус"
        title="Аренда самокатов"
        subtitle="Электросамокаты SmartCampus — быстрое передвижение между корпусами ГГНТУ."
      />

      {/* Active rental banner */}
      <AnimatePresence>
        {rental && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="bg-gradient-to-r from-burgundy to-burgundy-dark text-white p-6 overflow-hidden relative">
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Активная поездка</div>
                  <h3 className="font-display text-2xl mt-1">{rental.scooterModel}</h3>
                  <p className="text-sm text-white/70 mt-1">от станции «{rental.station}»</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="font-display text-3xl tabular-nums">{fmtTime(elapsed)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50 mt-1">Время</div>
                  </div>
                  <div className="text-center">
                    <div className="font-display text-3xl tabular-nums">
                      {50 + Math.max(1, Math.ceil(elapsed / 60)) * rental.pricePerMin}₽
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50 mt-1">Стоимость</div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={endRental}
                    className="!bg-white !text-burgundy hover:!bg-white/90 font-semibold"
                  >
                    Завершить
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance + Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 flex items-center gap-3 col-span-2 md:col-span-1 ring-1 ring-burgundy/20">
          <div className="h-9 w-9 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn("font-display text-lg leading-tight", balance > 0 ? "text-navy" : "text-accent-red")}>
              {balance}₽
            </div>
            <div className="text-[11px] text-muted uppercase tracking-wider">Баланс</div>
          </div>
          <button
            onClick={() => setShowTopUp(true)}
            className="h-7 w-7 rounded-lg bg-burgundy text-white flex items-center justify-center hover:bg-burgundy-dark transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
          </button>
        </Card>
        <MiniStat icon={<Bike className="h-4 w-4" />} label="Доступно" value={`${totalScooters}`} />
        <MiniStat icon={<MapPin className="h-4 w-4" />} label="Станций" value={`${STATIONS.length}`} />
        <MiniStat icon={<CreditCard className="h-4 w-4" />} label="от" value="4₽/мин" />
        <MiniStat icon={<Zap className="h-4 w-4" />} label="Разблокировка" value="30–50₽" />
      </div>

      {/* Stations list */}
      <div className="space-y-3">
        {STATIONS.map((station) => {
          const isOpen = selectedStation === station.id;
          return (
            <Card key={station.id} className="overflow-hidden">
              <button
                onClick={() => setSelectedStation(isOpen ? null : station.id)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-burgundy/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-burgundy" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-navy text-sm">{station.name}</h3>
                  <p className="text-xs text-muted truncate">{station.address}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={station.availableScooters.length > 0 ? "success" : "muted"}>
                    {station.availableScooters.length}/{station.totalSlots}
                  </Badge>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/40 divide-y divide-border/30">
                      {station.availableScooters.length === 0 ? (
                        <div className="px-5 py-6 text-center text-sm text-muted">
                          На этой станции сейчас нет доступных самокатов
                        </div>
                      ) : (
                        station.availableScooters.map((sc: Scooter) => (
                          <div
                            key={sc.id}
                            className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50/30 transition-colors"
                          >
                            <div className="h-8 w-8 rounded-lg bg-navy/5 flex items-center justify-center">
                              <Bike className="h-4 w-4 text-navy/60" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-navy">{sc.model}</div>
                              <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                                <span className="inline-flex items-center gap-1">
                                  {sc.battery > 20 ? (
                                    <Battery className="h-3 w-3" />
                                  ) : (
                                    <BatteryCharging className="h-3 w-3 text-warning" />
                                  )}
                                  {sc.battery}%
                                </span>
                                <span>~{sc.rangeKm} км</span>
                                <span>{sc.pricePerMin}₽/мин</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              disabled={!!rental || balance < sc.unlockFee}
                              onClick={() => {
                                if (balance < sc.unlockFee) {
                                  toast.error(`Нужно минимум ${sc.unlockFee}₽. Пополните баланс.`);
                                  setShowTopUp(true);
                                  return;
                                }
                                setConfirmScooter({ scooter: sc, station });
                              }}
                            >
                              {balance < sc.unlockFee ? "Мало средств" : "Арендовать"}
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Rules */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h4 className="font-semibold text-navy text-sm">Правила использования</h4>
        </div>
        <ul className="space-y-1.5">
          {RULES.map((r: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-burgundy/40 mt-1.5 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      </Card>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmScooter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setConfirmScooter(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl text-navy">Подтвердите аренду</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Модель</span>
                  <span className="font-medium text-navy">{confirmScooter.scooter.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Станция</span>
                  <span className="font-medium text-navy">{confirmScooter.station.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Заряд</span>
                  <span className="font-medium text-navy">{confirmScooter.scooter.battery}% (~{confirmScooter.scooter.rangeKm} км)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Разблокировка</span>
                  <span className="font-medium text-navy">{confirmScooter.scooter.unlockFee}₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Тариф</span>
                  <span className="font-medium text-navy">{confirmScooter.scooter.pricePerMin}₽/мин</span>
                </div>
              </div>
              {balance < confirmScooter.scooter.unlockFee && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-600 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Недостаточно средств. Нужно минимум {confirmScooter.scooter.unlockFee}₽
                </div>
              )}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/40">
                <span className="text-xs text-muted">Ваш баланс</span>
                <span className={cn("font-semibold text-sm", balance >= confirmScooter.scooter.unlockFee ? "text-navy" : "text-red-500")}>{balance}₽</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="ghost" className="flex-1" onClick={() => setConfirmScooter(null)}>
                  <X className="h-4 w-4 mr-1" /> Отмена
                </Button>
                <Button
                  className="flex-1"
                  disabled={balance < confirmScooter.scooter.unlockFee}
                  onClick={() => startRental(confirmScooter.scooter, confirmScooter.station)}
                >
                  <Check className="h-4 w-4 mr-1" /> Арендовать
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-up dialog */}
      <AnimatePresence>
        {showTopUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowTopUp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl text-navy">Пополнить баланс</h3>
              <p className="text-sm text-muted mt-1">Текущий баланс: <span className="font-semibold text-navy">{balance}₽</span></p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {TOP_UP_OPTIONS.map((amt: number) => (
                  <button
                    key={amt}
                    onClick={() => topUp(amt)}
                    className="h-12 rounded-xl bg-gray-50 hover:bg-burgundy hover:text-white text-navy font-semibold text-sm transition-colors"
                  >
                    +{amt}₽
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  placeholder="Другая сумма"
                  value={customAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomAmount(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-burgundy/30"
                  min={1}
                />
                <Button
                  size="sm"
                  disabled={!customAmount || Number(customAmount) <= 0}
                  onClick={() => topUp(Number(customAmount))}
                  className="h-10"
                >
                  Пополнить
                </Button>
              </div>

              <Button variant="ghost" className="w-full mt-3" onClick={() => setShowTopUp(false)}>
                Закрыть
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-display text-lg text-navy leading-tight">{value}</div>
        <div className="text-[11px] text-muted uppercase tracking-wider">{label}</div>
      </div>
    </Card>
  );
}
