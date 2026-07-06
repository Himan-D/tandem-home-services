import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import AIAssistant from './components/AIAssistant';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ConsumerBottomNav from './components/ConsumerBottomNav';
import UnreadBadge from './components/UnreadBadge';

const ConsumerHome = lazy(() => import('./pages/ConsumerHome'));
const ConsumerBooking = lazy(() => import('./pages/ConsumerBooking'));
const PartnerRegister = lazy(() => import('./pages/PartnerRegister'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard'));
const PartnerShifts = lazy(() => import('./pages/PartnerShifts'));
const PartnerPayouts = lazy(() => import('./pages/PartnerPayouts'));
const PartnerNotifications = lazy(() => import('./pages/PartnerNotifications'));
const PartnerProfile = lazy(() => import('./pages/PartnerProfile'));
const ConsumerDashboard = lazy(() => import('./pages/ConsumerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminServices = lazy(() => import('./pages/AdminServices'));
const AdminPromos = lazy(() => import('./pages/AdminPromos'));
const AdminDarkStores = lazy(() => import('./pages/AdminDarkStores'));
const AdminServiceAreas = lazy(() => import('./pages/AdminServiceAreas'));
const AdminPartners = lazy(() => import('./pages/AdminPartners'));
const AdminCustomers = lazy(() => import('./pages/AdminCustomers'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminPayouts = lazy(() => import('./pages/AdminPayouts'));
const AdminDisputes = lazy(() => import('./pages/AdminDisputes'));
const NotificationHistory = lazy(() => import('./pages/NotificationHistory'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const MagicLink = lazy(() => import('./pages/MagicLink'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const LiveTracking = lazy(() => import('./pages/LiveTracking'));
const JobNavigation = lazy(() => import('./pages/JobNavigation'));
const TandemPlus = lazy(() => import('./pages/TandemPlus'));
const BookingStatus = lazy(() => import('./pages/BookingStatus'));
const ServiceDetails = lazy(() => import('./pages/ServiceDetails'));
const Account = lazy(() => import('./pages/Account'));
const GiftCards = lazy(() => import('./pages/GiftCards'));
const PartnerDisputes = lazy(() => import('./pages/PartnerDisputes'));
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'));

const PageFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div className="spinner" aria-label="Loading" />
  </div>
);

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  
  return children;
}

export default function App({ userFromSSR }) {
  return (
    <AuthProvider initialUser={userFromSSR}>
      <SocketProvider>
        <UnreadBadge>
        <ErrorBoundary>
          <Navbar />
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<ConsumerHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/partner/register" element={<PartnerRegister />} />
          <Route path="/magic-link" element={<MagicLink />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute allowedRoles={['consumer']}>
                <Onboarding />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/plus" 
            element={
              <ProtectedRoute allowedRoles={['consumer']}>
                <TandemPlus />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['consumer', 'admin']}>
                <ConsumerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/service/:serviceId" element={<ServiceDetails />} />
          <Route 
            path="/booking-status/:jobId" 
            element={
              <ProtectedRoute allowedRoles={['consumer', 'admin']}>
                <BookingStatus />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/track/:jobId" 
            element={
              <ProtectedRoute allowedRoles={['consumer', 'admin']}>
                <LiveTracking />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/book/:serviceId" 
            element={
              <ProtectedRoute allowedRoles={['consumer', 'admin']}>
                <ConsumerBooking />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/partner" 
            element={
              <ProtectedRoute allowedRoles={['partner', 'admin']}>
                <PartnerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/partner/shifts" 
            element={
              <ProtectedRoute allowedRoles={['partner', 'admin']}>
                <PartnerShifts />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/partner/payouts" 
            element={
              <ProtectedRoute allowedRoles={['partner', 'admin']}>
                <PartnerPayouts />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/partner/notifications" 
            element={
              <ProtectedRoute allowedRoles={['partner', 'admin']}>
                <PartnerNotifications />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/partner/profile"
            element={
              <ProtectedRoute allowedRoles={['partner', 'admin']}>
                <PartnerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partner/disputes"
            element={
              <ProtectedRoute allowedRoles={['partner', 'admin']}>
                <PartnerDisputes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partner/job/:jobId"
            element={
              <ProtectedRoute allowedRoles={['partner', 'admin']}>
                <JobNavigation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/partner/calendar" 
            element={
              <ProtectedRoute allowedRoles={['partner', 'admin']}>
                <PartnerDashboard initialView="calendar" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/partner/earnings" 
            element={
              <ProtectedRoute allowedRoles={['partner', 'admin']}>
                <PartnerDashboard initialView="earnings" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/partner/services" 
            element={
              <ProtectedRoute allowedRoles={['partner', 'admin']}>
                <PartnerDashboard initialView="services" />
              </ProtectedRoute>
            } 
          />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/services" element={<ProtectedRoute allowedRoles={['admin']}><AdminServices /></ProtectedRoute>} />
          <Route path="/admin/promos" element={<ProtectedRoute allowedRoles={['admin']}><AdminPromos /></ProtectedRoute>} />
          <Route path="/admin/dark-stores" element={<ProtectedRoute allowedRoles={['admin']}><AdminDarkStores /></ProtectedRoute>} />
          <Route path="/admin/service-areas" element={<ProtectedRoute allowedRoles={['admin']}><AdminServiceAreas /></ProtectedRoute>} />
          <Route path="/admin/partners" element={<ProtectedRoute allowedRoles={['admin']}><AdminPartners /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={['admin']}><AdminCustomers /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/payouts" element={<ProtectedRoute allowedRoles={['admin']}><AdminPayouts /></ProtectedRoute>} />
          <Route path="/admin/disputes" element={<ProtectedRoute allowedRoles={['admin']}><AdminDisputes /></ProtectedRoute>} />
          <Route 
            path="/notifications/history" 
            element={
              <ProtectedRoute allowedRoles={['consumer', 'partner', 'admin']}>
                <NotificationHistory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/account/notifications" 
            element={
              <ProtectedRoute allowedRoles={['consumer']}>
                <ConsumerNotifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/account" 
            element={
              <ProtectedRoute allowedRoles={['consumer']}>
                <Account />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gift-cards" 
            element={
              <ProtectedRoute allowedRoles={['consumer', 'admin']}>
                <GiftCards />
              </ProtectedRoute>
            } 
          />
          <Route path="/page/:pageId" element={<PlaceholderPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        <AIAssistant />
        <ConsumerBottomNav />
        </ErrorBoundary>
        </UnreadBadge>
      </SocketProvider>
    </AuthProvider>
  );
}
