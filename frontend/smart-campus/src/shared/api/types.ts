// SmartCampus API types — generated from swagger.yaml v1.1.0

export type Role = "student" | "teacher" | "applicant" | "librarian" | "admin";

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  groupName?: string;
  department?: string;
  telegramChatId?: number | null;
  telegramUsername?: string;
  isTelegramVerified: boolean;
  personalDataConsent: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  fullName: string;
  role: string;
  groupName?: string;
  department?: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  groupName?: string;
  department?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  address?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  isOldBuilding: boolean;
  navigationMode: "text" | "map" | "hybrid";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  number: number;
  name?: string;
  mapImageUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type RoomType =
  | "lecture"
  | "computer_lab"
  | "coworking"
  | "meeting"
  | "office"
  | "library"
  | "lab"
  | "other";

export interface Room {
  id: string;
  buildingId: string;
  floorId: string;
  building?: Building;
  floor?: Floor;
  number: string;
  name?: string;
  type: RoomType;
  capacity: number;
  description?: string;
  equipment?: string[];
  navigationHint?: string;
  nearbyLandmarks?: string;
  isBookable: boolean;
  isActive: boolean;
  xCoord?: number | null;
  yCoord?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomNavigation {
  building: Building;
  floor: Floor;
  room: Room;
  navigationHint?: string;
  nearbyLandmarks?: string;
  mapImageUrl?: string;
  xCoord?: number | null;
  yCoord?: number | null;
}

export interface CampusRoute {
  id: string;
  fromBuildingId: string;
  toBuildingId: string;
  fromBuilding?: Building;
  toBuilding?: Building;
  title?: string;
  description: string;
  estimatedMinutes: number;
  distanceMeters?: number | null;
  routeType: "walking" | "indoor" | "accessible";
  accessibilityNotes?: string;
}

export interface Schedule {
  id: string;
  roomId?: string | null;
  roomNumber?: string;
  room?: Room;
  title: string;
  teacherId?: string;
  teacherName?: string;
  groupName?: string;
  startsAt: string;
  endsAt: string;
  source: "manual" | "isu" | "sync" | "fallback";
}

export interface ScheduleCurrent {
  now: string;
  currentLesson: Schedule | null;
  nextLesson: Schedule | null;
}

export interface TimeSlot {
  startsAt: string;
  endsAt: string;
  title?: string;
  source?: string;
}

export interface RoomAvailability {
  date: string;
  workingFrom: string;
  workingTo: string;
  busySlots: TimeSlot[];
  freeSlots: TimeSlot[];
}

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Booking {
  id: string;
  roomId: string;
  room?: Room;
  requestedBy: string;
  title: string;
  purpose?: string;
  bookingType: "meeting" | "lecture" | "event" | "study" | "other";
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  adminComment?: string;
  reviewedBy?: string;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingCreateRequest {
  roomId: string;
  title: string;
  purpose?: string;
  bookingType?: "meeting" | "lecture" | "event" | "study" | "other";
  startsAt: string;
  endsAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  channel: "in_app" | "telegram" | "email";
  title: string;
  message: string;
  isRead: boolean;
  isSent: boolean;
  sentAt?: string | null;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

export interface AISource {
  type: string;
  id: string;
  title: string;
}

export interface AIAnswer {
  sessionId: string;
  answer: string;
  sources?: AISource[];
}

export interface AIChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface ApplicantFAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  keywords?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceSession {
  id: string;
  scheduleId?: string;
  roomId: string;
  teacherId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  attendanceSessionId: string;
  studentId: string;
  status: AttendanceStatus;
  markedBy: string;
  markedAt: string;
  comment?: string;
}

export interface AttendanceSummary {
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

export interface AttendancePolicy {
  maxSemesterPoints: number;
  admissionMinPoints: number;
  requiredRate: number;
  requiredPercent: number;
  absencePenaltyPoints: number;
  latePenaltyPoints: number;
  excusedPenaltyPoints: number;
  presentRewardPoints: number;
  lateRewardPoints: number;
  excusedRewardPoints: number;
  admissionRule?: string;
  notes?: string[];
}

export interface StudentAttendanceAnalytics {
  student: PublicUser;
  summary: AttendanceSummary;
  policy: AttendancePolicy;
  attendancePercent: number;
  currentPoints: number;
  penaltyPoints: number;
  rewardPoints: number;
  pointsToAdmission: number;
  admissionStatus:
    | "no_data"
    | "admitted"
    | "attendance_risk"
    | "points_risk"
    | "not_admitted";
  remainingAbsencesBeforeRisk: number;
  recommendation?: string;
}

export interface LibraryBook {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  category?: string;
  description?: string;
  totalCopies: number;
  availableCopies: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryLoan {
  id: string;
  bookId: string;
  book?: LibraryBook;
  userId: string;
  issuedBy?: string;
  returnedBy?: string;
  status: "active" | "returned" | "overdue";
  issuedAt: string;
  dueAt: string;
  returnedAt?: string | null;
}

export interface LibrarySummary {
  totalBooks: number;
  availableCopies: number;
  activeLoans: number;
  overdueLoans: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  totalBuildings: number;
  totalRooms: number;
  totalBookings: number;
  pendingBookings: number;
  approvedBookingsToday: number;
  totalNotificationsSent: number;
  totalAttendanceSessions: number;
  averageAttendanceRate: number;
  totalBooks: number;
  activeLibraryLoans: number;
  aiQuestionsCount: number;
  telegramMessagesCount: number;
}

export type BookingsByStatus = Record<string, number>;

export interface RoomUtilizationRow {
  roomId: string;
  roomNumber: string;
  bookingsCount: number;
  hoursBooked: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  isp?: string;
  org?: string;
  asNumber?: string;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  threatLevel: string;
  threatTypes: string[];
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  createdAt: string;
}

export interface SecurityAlert {
  id: string;
  auditLogId?: string;
  userId?: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  metadata?: Record<string, unknown>;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface CountStat {
  name: string;
  count: number;
}

export interface SecurityDashboard {
  totalEvents: number;
  eventsLast24h: number;
  uniqueIPs24h: number;
  uniqueUsers24h: number;
  failedLogins24h: number;
  vpnAccesses24h: number;
  proxyAccesses24h: number;
  torAccesses24h: number;
  threatsByLevel: Record<string, number>;
  topCountries: CountStat[];
  topISPs: CountStat[];
  recentAlerts: SecurityAlert[];
  unresolvedAlerts: number;
}

export interface PrivacyMeResult {
  storedPersonalData: string[];
  user: User;
}

export interface TelegramLinkStart {
  code: string;
  expiresIn: string;
  command: string;
}

// ---------- ISU / BRS ----------

export interface ISULoginRequest {
  username: string;
  password: string;
}

export interface BRSTeacher {
  name: string;
  role: "lecture" | "practice" | "lab";
}

export interface BRSGrade {
  disciplineId: number;
  disciplineName: string;
  teacherName: string;
  teachers?: BRSTeacher[];
  att1Current: number;
  att1Border: number;
  att2Current: number;
  att2Border: number;
  attendance: number;
  independentWork: number;
  retake: number;
  bonus: number;
  total: number;
  examType: string;
  isOpen1: boolean;
  isOpen2: boolean;
}

export interface BRSJournalEntry {
  pk: number;
  attended: boolean;
  date: string;
  grade: number;
}

export interface BRSResult {
  grades: BRSGrade[];
  semesterNum: number;
  yearStart: number;
  yearEnd: number;
  error?: string;
}

export interface ISUInstitute {
  id: number;
  unit: string;
  name: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
