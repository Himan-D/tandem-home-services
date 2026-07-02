import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import ConsumerHome from './pages/ConsumerHome';
import ConsumerBooking from './pages/ConsumerBooking';
import PartnerDashboard from './pages/PartnerDashboard';
import ConsumerDashboard from './pages/ConsumerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MagicLink from './pages/MagicLink';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import LiveTracking from './pages/LiveTracking';
import JobNavigation from './pages/JobNavigation';
import TandemPlus from './pages/TandemPlus';
import BookingStatus from './pages/BookingStatus';
import ServiceDetails from './pages/ServiceDetails';
import Account from './pages/Account';
import PlaceholderPage from './pages/PlaceholderPage';
import AIAssistant from './components/AIAssistant';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ConsumerBottomNav from './components/ConsumerBottomNav';

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
        <AIAssistant />
        <ConsumerBottomNav />
        </ErrorBoundary>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
