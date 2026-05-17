import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/widgets/app-layout/AppLayout";
import { ProtectedRoute, GuestOnly, RoleGuard } from "@/features/auth/guards";
import { LoadingState } from "@/shared/ui/states";

const LoginPage = lazy(() => import("@/pages/login/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/register/RegisterPage"));
const PublicFaqPage = lazy(() => import("@/pages/applicant-faq/PublicFaqPage"));

const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const PrivacyPage = lazy(() => import("@/pages/profile/PrivacyPage"));
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage"));
const TelegramPage = lazy(() => import("@/pages/profile/TelegramPage"));
const AiPage = lazy(() => import("@/pages/ai/AiPage"));

const SchedulePage = lazy(() => import("@/pages/schedule/SchedulePage"));
const ScheduleCurrentPage = lazy(() => import("@/pages/schedule/ScheduleCurrentPage"));
const RoomsPage = lazy(() => import("@/pages/rooms/RoomsPage"));
const RoomDetailsPage = lazy(() => import("@/pages/rooms/RoomDetailsPage"));
const RoomAvailabilityPage = lazy(() => import("@/pages/rooms/RoomAvailabilityPage"));
const NavigationPage = lazy(() => import("@/pages/navigation/NavigationPage"));
const MyBookingsPage = lazy(() => import("@/pages/bookings/MyBookingsPage"));
const CreateBookingPage = lazy(() => import("@/pages/bookings/CreateBookingPage"));
const BRSPage = lazy(() => import("@/pages/brs/BRSPage"));
const InstitutesPage = lazy(() => import("@/pages/institutes/InstitutesPage"));
const AttendanceMyPage = lazy(() => import("@/pages/attendance/AttendanceMyPage"));
const AttendanceAnalyticsPage = lazy(() => import("@/pages/attendance/AttendanceAnalyticsPage"));
const AcademicAnalyticsPage = lazy(() => import("@/pages/analytics/AcademicAnalyticsPage"));
const LeaderboardPage = lazy(() => import("@/pages/leaderboard/LeaderboardPage"));
const LibraryPage = lazy(() => import("@/pages/library/LibraryPage"));
const LibraryBookPage = lazy(() => import("@/pages/library/LibraryBookPage"));
const LibraryLoansMyPage = lazy(() => import("@/pages/library/LibraryLoansMyPage"));

const TeacherSchedulePage = lazy(() => import("@/pages/teacher/TeacherSchedulePage"));
const AttendanceSessionsPage = lazy(() => import("@/pages/teacher/AttendanceSessionsPage"));
const AttendanceSessionDetailsPage = lazy(() => import("@/pages/teacher/AttendanceSessionDetailsPage"));
const AttendanceByGroupPage = lazy(() => import("@/pages/teacher/AttendanceByGroupPage"));

const ApplicantHomePage = lazy(() => import("@/pages/applicant/ApplicantHomePage"));

const LibraryManageBooksPage = lazy(() => import("@/pages/librarian/LibraryManageBooksPage"));
const LibraryManageLoansPage = lazy(() => import("@/pages/librarian/LibraryManageLoansPage"));
const LibraryAnalyticsPage = lazy(() => import("@/pages/librarian/LibraryAnalyticsPage"));

const AdminHomePage = lazy(() => import("@/pages/admin/AdminHomePage"));
const AdminBuildingsPage = lazy(() => import("@/pages/admin/AdminBuildingsPage"));
const AdminBuildingDetailsPage = lazy(() => import("@/pages/admin/AdminBuildingDetailsPage"));
const AdminRoomsPage = lazy(() => import("@/pages/admin/AdminRoomsPage"));
const AdminNavigationPage = lazy(() => import("@/pages/admin/AdminNavigationPage"));
const AdminBookingsPage = lazy(() => import("@/pages/admin/AdminBookingsPage"));
const AdminAttendancePage = lazy(() => import("@/pages/admin/AdminAttendancePage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminFaqPage = lazy(() => import("@/pages/admin/AdminFaqPage"));
const AdminAuditLogsPage = lazy(() => import("@/pages/admin/AdminAuditLogsPage"));
const AdminSecurityPage = lazy(() => import("@/pages/admin/AdminSecurityPage"));

function Loading() {
  return (
    <div className="p-8">
      <LoadingState rows={6} />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        <Route path="/applicant-faq" element={<PublicFaqPage />} />
        <Route path="/applicant-faq/search" element={<PublicFaqPage />} />

        {/* Authenticated */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/telegram" element={<TelegramPage />} />
          <Route path="/ai" element={<AiPage />} />

          {/* Student */}
          <Route path="/brs" element={<BRSPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/schedule/current" element={<ScheduleCurrentPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/:id" element={<RoomDetailsPage />} />
          <Route path="/rooms/:id/availability" element={<RoomAvailabilityPage />} />
          <Route path="/navigation/room/:roomId" element={<NavigationPage />} />
          <Route path="/bookings/my" element={<MyBookingsPage />} />
          <Route path="/bookings/create" element={<CreateBookingPage />} />
          <Route path="/attendance/my" element={<AttendanceMyPage />} />
          <Route path="/attendance/analytics" element={<AttendanceAnalyticsPage />} />
          <Route path="/analytics" element={<AcademicAnalyticsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/institutes" element={<InstitutesPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/books/:id" element={<LibraryBookPage />} />
          <Route path="/library/loans/my" element={<LibraryLoansMyPage />} />

          {/* Teacher */}
          <Route path="/teacher/schedule" element={<TeacherSchedulePage />} />
          <Route path="/attendance/sessions" element={<AttendanceSessionsPage />} />
          <Route path="/attendance/sessions/:id" element={<AttendanceSessionDetailsPage />} />
          <Route path="/attendance/by-group" element={<AttendanceByGroupPage />} />

          {/* Applicant */}
          <Route path="/applicant" element={<ApplicantHomePage />} />
          <Route path="/applicant/faq" element={<PublicFaqPage />} />

          {/* Librarian */}
          <Route
            path="/library/manage/books"
            element={
              <RoleGuard roles={["librarian", "admin"]}>
                <LibraryManageBooksPage />
              </RoleGuard>
            }
          />
          <Route
            path="/library/manage/loans"
            element={
              <RoleGuard roles={["librarian", "admin"]}>
                <LibraryManageLoansPage />
              </RoleGuard>
            }
          />
          <Route
            path="/analytics/library"
            element={
              <RoleGuard roles={["librarian", "admin"]}>
                <LibraryAnalyticsPage />
              </RoleGuard>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminHomePage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/buildings"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminBuildingsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/buildings/:id"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminBuildingDetailsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/rooms"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminRoomsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/navigation"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminNavigationPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminBookingsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminAttendancePage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminAnalyticsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/faq"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminFaqPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminAuditLogsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/security"
            element={
              <RoleGuard roles={["admin"]}>
                <AdminSecurityPage />
              </RoleGuard>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
