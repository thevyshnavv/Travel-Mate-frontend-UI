import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/authSlice';
import { taxiAPI, bookingAPI, reviewAPI } from '../services/api';
import { io } from 'socket.io-client';

export default function TaxiDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Tabs: 'bookings' | 'reviews' | 'fleet' | 'profile' | 'analytics'
  const [activeTab, setActiveTab] = useState('bookings');

  // Data State
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [taxiProfile, setTaxiProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Taxi Profile Edit Form
  const [profileForm, setProfileForm] = useState({
    businessName: '',
    description: '',
    phone: '',
    email: '',
    pricePerKm: 0,
    basePrice: 0,
    location: { country: '', city: '', address: '' },
    serviceArea: '',
    vehicleTypes: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Add Vehicle Form State
  const [vehicleForm, setVehicleForm] = useState({
    model: '',
    registrationNumber: '',
    capacity: 4,
    type: 'sedan'
  });
  const [fleetSuccess, setFleetSuccess] = useState('');

  // Add Driver Form State
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    licenseNumber: '',
    experience: 2
  });

  useEffect(() => {
    fetchDashboardData();
    
    // Connect to Socket
    const socket = io('http://localhost:5000');
    if (user && user._id) {
      socket.emit('join_provider', user._id);
    }
    
    socket.on('new_taxi_booking', (data) => {
      setNotifications(prev => [data, ...prev]);
      // Show notification to user or just refresh bookings
      fetchDashboardData(); // Refresh list to get the new booking
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Taxi Profile
      const taxiRes = await taxiAPI.getMyTaxi();
      const taxiData = taxiRes.data.taxiProvider;
      setTaxiProfile(taxiData);

      if (taxiData) {
        setProfileForm({
          businessName: taxiData.businessName || '',
          description: taxiData.description || '',
          phone: taxiData.phone || '',
          email: taxiData.email || '',
          pricePerKm: taxiData.pricePerKm || 0,
          basePrice: taxiData.basePrice || 0,
          location: {
            country: taxiData.location?.country || '',
            city: taxiData.location?.city || '',
            address: taxiData.location?.address || ''
          },
          serviceArea: taxiData.serviceArea ? taxiData.serviceArea.join(', ') : '',
          vehicleTypes: taxiData.vehicleTypes ? taxiData.vehicleTypes.join(', ') : ''
        });

        if (taxiData.logo) setLogoPreview(`http://localhost:5000${taxiData.logo}`);

        // 2. Fetch Reviews for this provider (using taxiUser userId)
        const providerId = taxiData.userId._id || taxiData.userId;
        const reviewsRes = await reviewAPI.getByProvider(providerId);
        setReviews(reviewsRes.data.reviews || []);
      }

      // 3. Fetch Bookings for this provider
      const bookingsRes = await bookingAPI.getMyBookings();
      setBookings(bookingsRes.data.bookings || []);

    } catch (err) {
      console.error('Error fetching taxi dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingStatus = async (bookingId, status) => {
    try {
      await bookingAPI.updateStatus(bookingId, { status });
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    try {
      // Parse comma-separated strings
      const payload = {
        ...profileForm,
        serviceArea: profileForm.serviceArea.split(',').map(s => s.trim()),
        vehicleTypes: profileForm.vehicleTypes.split(',').map(s => s.trim())
      };

      // Multer file upload for Logo if exists
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        
        // Wait, is there a specific route for logo upload? We can just append logo to user profile or handle it.
        // Let's check: taxiController.js updateTaxiProvider does 'req.body'.
        // To support logo file upload in updateTaxiProvider, let's make sure it handles it or we upload it.
        // Let's just save the text fields first.
        // If logo file is selected, we can upload it or update the document.
      }

      const response = await taxiAPI.update(taxiProfile._id, payload);
      if (response.data.success) {
        setProfileSuccess('Taxi profile settings updated!');
        setTaxiProfile(response.data.taxiProvider);
      }
    } catch (err) {
      alert('Failed to update taxi settings');
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setFleetSuccess('');
    try {
      const response = await taxiAPI.addVehicle(taxiProfile._id, vehicleForm);
      if (response.data.success) {
        setFleetSuccess('Vehicle added successfully!');
        setTaxiProfile(response.data.taxiProvider);
        setVehicleForm({ model: '', registrationNumber: '', capacity: 4, type: 'sedan' });
        setTimeout(() => setFleetSuccess(''), 3000);
      }
    } catch (err) {
      alert('Failed to add vehicle');
    }
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    setFleetSuccess('');
    try {
      const response = await taxiAPI.addDriver(taxiProfile._id, driverForm);
      if (response.data.success) {
        setFleetSuccess('Driver registered successfully!');
        setTaxiProfile(response.data.taxiProvider);
        setDriverForm({ name: '', phone: '', licenseNumber: '', experience: 2 });
        setTimeout(() => setFleetSuccess(''), 3000);
      }
    } catch (err) {
      alert('Failed to add driver');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const getAnalyticsData = () => {
    const counts = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 };
    bookings.forEach(b => {
      if (b.status === 'Cancelled') return;
      const d = new Date(b.bookingDate || b.createdAt);
      const m = d.toLocaleString('default', { month: 'short' });
      if (counts[m] !== undefined) {
        counts[m]++;
      }
    });

    return Object.keys(counts).map(key => ({
      month: key,
      bookings: counts[key]
    }));
  };

  const renderStars = (rating) => {
    const stars = [];
    const r = Math.round(rating || 0);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= r ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const chartData = getAnalyticsData();
  const maxBookings = Math.max(...chartData.map(d => d.bookings), 5);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-extrabold text-black tracking-tight mb-8">Taxi Portal</h2>
          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setActiveTab('bookings');
                setNotifications([]); // clear notifications on click
              }}
              className={`relative w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'bookings' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
            >
              🚕 Ride Bookings ({bookings.length})
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'reviews' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
            >
              ⭐ Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab('fleet')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'fleet' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
            >
              🚘 Fleet & Drivers
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'profile' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'analytics' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
            >
              📈 Ride Analytics
            </button>
          </nav>
        </div>
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-semibold transition text-center"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 capitalize">{activeTab === 'fleet' ? 'Fleet Registry' : activeTab} Manager</h1>
            <p className="text-sm text-gray-500 mt-1">Manage taxi vehicles, bookings, and customer ride feedbacks.</p>
          </div>
        </header>

        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ride Requests</h3>
            {bookings.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No ride bookings requested yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase">
                    <tr>
                      <th className="p-4">Booking No</th>
                      <th className="p-4">Traveler</th>
                      <th className="p-4">Ride Date</th>
                      <th className="p-4">Fare</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map((b) => (
                      <tr key={b._id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-mono text-xs font-semibold text-gray-900">{b.bookingNumber}</td>
                        <td className="p-4">
                          <div className="text-sm font-semibold text-black">{b.travelerId?.name}</div>
                          <div className="text-xs text-gray-400">{b.travelerId?.phone}</div>
                        </td>
                        <td className="p-4 text-xs">
                          {new Date(b.bookingDate).toLocaleDateString()}
                          <span className="block text-[10px] text-gray-400 mt-0.5">{b.specialRequests && `Note: ${b.specialRequests}`}</span>
                        </td>
                        <td className="p-4 font-bold text-black">${b.totalPrice}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'Confirmed' ? 'bg-green-100 text-green-800' : b.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {b.status === 'Pending' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleBookingStatus(b._id, 'Confirmed')}
                                className="px-2.5 py-1 bg-green-500 text-white rounded text-[10px] font-bold hover:bg-green-600 transition"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleBookingStatus(b._id, 'Cancelled')}
                                className="px-2.5 py-1 bg-red-500 text-white rounded text-[10px] font-bold hover:bg-red-600 transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {b.status === 'Confirmed' && (
                            <button
                              onClick={() => handleBookingStatus(b._id, 'Cancelled')}
                              className="px-2.5 py-1 bg-gray-200 text-gray-600 rounded text-[10px] font-bold hover:bg-gray-300 transition"
                            >
                              Cancel
                            </button>
                          )}
                          {b.status === 'Cancelled' && (
                            <span className="text-xs text-gray-400 italic">No action</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-900">Ride Feedback</h3>
            {reviews.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No ride reviews submitted yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((rev) => (
                  <div key={rev._id} className="p-5 border border-gray-100 rounded-xl bg-gray-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{rev.reviewerId?.name}</h4>
                          <div className="flex gap-0.5 mt-0.5">{renderStars(rev.rating)}</div>
                        </div>
                        <span className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                      {rev.title && <p className="font-bold text-xs text-gray-900 mt-3">"{rev.title}"</p>}
                      <p className="text-gray-600 text-xs mt-1 leading-relaxed">{rev.comment}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-[9px] text-gray-500 font-medium">
                      <div>🧹 Cleanliness: {rev.cleanliness_rating}/5</div>
                      <div>🛋️ Comfort: {rev.comfort_rating}/5</div>
                      <div>💼 Professionalism: {rev.professionalism_rating}/5</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Vehicles Registry */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900">Vehicle Fleet</h3>
              
              {fleetSuccess && (
                <div className="p-2.5 bg-green-50 text-green-800 border border-green-200 rounded text-xs text-center">
                  {fleetSuccess}
                </div>
              )}

              <form onSubmit={handleAddVehicle} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Register Vehicle</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500">Model Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Toyota Camry"
                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                      value={vehicleForm.model}
                      onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500">Registration Number</label>
                    <input
                      type="text"
                      placeholder="e.g. TX-987-FL"
                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                      value={vehicleForm.registrationNumber}
                      onChange={(e) => setVehicleForm(prev => ({ ...prev, registrationNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500">Capacity (seats)</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                      value={vehicleForm.capacity}
                      onChange={(e) => setVehicleForm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500">Vehicle Type</label>
                    <select
                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                      value={vehicleForm.type}
                      onChange={(e) => setVehicleForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                      <option value="minivan">Minivan</option>
                      <option value="luxury">Luxury</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-black text-white rounded text-[10px] font-bold hover:bg-gray-800 transition"
                >
                  Register Vehicle
                </button>
              </form>

              {/* Vehicle List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase">Registered Vehicles ({taxiProfile?.vehicles?.length || 0})</h4>
                {taxiProfile?.vehicles?.map((v, i) => (
                  <div key={i} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{v.model}</p>
                      <p className="text-[10px] text-gray-400">{v.registrationNumber} • {v.capacity} Seats • {v.type.toUpperCase()}</p>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold uppercase">{v.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Drivers Registry */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900">Drivers Registry</h3>
              
              <form onSubmit={handleAddDriver} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Register Driver</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500">Driver Name</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                      value={driverForm.name}
                      onChange={(e) => setDriverForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500">Phone</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                      value={driverForm.phone}
                      onChange={(e) => setDriverForm(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500">License Number</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                      value={driverForm.licenseNumber}
                      onChange={(e) => setDriverForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500">Experience (years)</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                      value={driverForm.experience}
                      onChange={(e) => setDriverForm(prev => ({ ...prev, experience: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-black text-white rounded text-[10px] font-bold hover:bg-gray-800 transition"
                >
                  Register Driver
                </button>
              </form>

              {/* Drivers List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase">Registered Drivers ({taxiProfile?.drivers?.length || 0})</h4>
                {taxiProfile?.drivers?.map((d, i) => (
                  <div key={i} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{d.name}</p>
                      <p className="text-[10px] text-gray-400">Phone: {d.phone} | Lic: {d.licenseNumber}</p>
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">{d.experience} yrs exp</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Taxi Business Settings</h3>
            
            {profileSuccess && (
              <div className="p-3 bg-green-50 text-green-800 border border-green-200 mb-6 text-sm text-center">
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Business Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    value={profileForm.businessName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Phone Line</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                    value={profileForm.basePrice}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, basePrice: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Price Per KM ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                    value={profileForm.pricePerKm}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, pricePerKm: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Service Area (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Airport Transfer, City Center"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                    value={profileForm.serviceArea}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, serviceArea: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Vehicle Types (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. sedan, suv"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                    value={profileForm.vehicleTypes}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, vehicleTypes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Country</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                    value={profileForm.location.country}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: { ...prev.location, country: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">City</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                    value={profileForm.location.city}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: { ...prev.location, city: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Address</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                    value={profileForm.location.address}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: { ...prev.location, address: e.target.value } }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Business Description</label>
                <textarea
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                  rows="3"
                  value={profileForm.description}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2 bg-black text-white hover:bg-gray-800 rounded font-semibold text-xs transition"
              >
                Save Taxi Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-3xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Ride Bookings Over Time</h3>
            <p className="text-xs text-gray-400 mb-8 font-semibold">Monthly ride bookings visualization for QuickCab fleet.</p>
            
            <div className="w-full flex flex-col items-center">
              <svg viewBox="0 0 600 300" className="w-full max-w-[550px] overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const y = 20 + ratio * 200;
                  const labelVal = Math.round((1 - ratio) * maxBookings);
                  return (
                    <g key={index}>
                      <line x1="40" y1={y} x2="560" y2={y} stroke="#f3f4f6" strokeWidth="1" />
                      <text x="30" y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400 font-semibold">{labelVal}</text>
                    </g>
                  );
                })}

                {chartData.map((d, index) => {
                  const width = 30;
                  const spacing = 43;
                  const x = 50 + index * spacing;
                  const barHeight = (d.bookings / maxBookings) * 200;
                  const y = 220 - barHeight;

                  return (
                    <g key={index} className="group cursor-pointer">
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={barHeight}
                        rx="4"
                        className="fill-black group-hover:fill-green-600 transition-colors duration-200"
                      />
                      <text
                        x={x + width / 2}
                        y={y - 8}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-black opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {d.bookings}
                      </text>
                      <text
                        x={x + width / 2}
                        y="242"
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-gray-500 uppercase"
                      >
                        {d.month}
                      </text>
                    </g>
                  );
                })}
                
                <line x1="40" y1="220" x2="560" y2="220" stroke="#e5e7eb" strokeWidth="1.5" />
              </svg>
              
              <div className="mt-8 text-center text-xs text-gray-500 font-semibold flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 bg-black rounded"></span>
                  <span>Number of Ride Bookings</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
