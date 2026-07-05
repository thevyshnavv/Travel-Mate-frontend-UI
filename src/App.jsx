import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BrowseAgencies from './pages/BrowseAgencies';
import BrowseTaxis from './pages/BrowseTaxis';
import Profile from './pages/Profile';
import AgencyDashboard from './pages/AgencyDashboard';
import TaxiDashboard from './pages/TaxiDashboard';
import AgencyDetails from './pages/AgencyDetails';
import PackageDetails from './pages/PackageDetails';
import TaxiDetails from './pages/TaxiDetails';
import MyBookings from './pages/MyBookings';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route
          path="/browse-agencies"
          element={
            <ProtectedRoute>
              <BrowseAgencies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agency/:id"
          element={
            <ProtectedRoute>
              <AgencyDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/package/:id"
          element={
            <ProtectedRoute>
              <PackageDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/browse-taxis"
          element={
            <ProtectedRoute>
              <BrowseTaxis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/taxi/:id"
          element={
            <ProtectedRoute>
              <TaxiDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agency-dashboard"
          element={
            <ProtectedRoute>
              <AgencyDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/taxi-dashboard"
          element={
            <ProtectedRoute>
              <TaxiDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;