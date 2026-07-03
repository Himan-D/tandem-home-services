import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import AIAssistant from './components/AIAssistant';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ConsumerBottomNav from './components/ConsumerBottomNav';

const ConsumerHome = lazy(() => import('./pages/ConsumerHome'));
const ConsumerBooking = lazy(() => import('./pages/ConsumerBooking'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard'));
const ConsumerDashboard = lazy(() => import('./pages/ConsumerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
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

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Navbar />
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<ConsumerHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
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
          <Route 
            path="/account" 
            element={
              <ProtectedRoute allowedRoles={['consumer']}>
                <Account />
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
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
