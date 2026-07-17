import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/authSlice';
import { agencyAPI, bookingAPI, reviewAPI, guideAPI } from '../services/api';
import { io } from 'socket.io-client';

export default function AgencyDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Tabs: 'bookings' | 'reviews' | 'profile' | 'analytics'
  const [activeTab, setActiveTab] = useState('bookings');
  
  // Data State
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [agencyProfile, setAgencyProfile] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  // Agency Edit Profile Form
  const [profileForm, setProfileForm] = useState({
    agencyName: '',
    description: '',
    phone: '',
    website: '',
    location: { country: '', city: '', address: '' },
    priceRange: { min: 0, max: 0 },
    specialties: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Create Package Form
  const [newPkgForm, setNewPkgForm] = useState({
    packageName: '',
    description: '',
    destination_country: '',
    destination_city: '',
    duration_days: 1,
    duration_nights: 0,
    pricePerPerson: 100,
    included: '',
    maxGroupSize: 10
  });
  const [pkgImages, setPkgImages] = useState([]);
  const [pkgSuccess, setPkgSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState(null);

  // Guide Management State
  const [guides, setGuides] = useState([]);
  const [newGuideForm, setNewGuideForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Active'
  });
  const [guideSuccess, setGuideSuccess] = useState('');
  const [guideEditMode, setGuideEditMode] = useState(false);
  const [editingGuideId, setEditingGuideId] = useState(null);

  useEffect(() => {
    fetchDashboardData();

    const socket = io(import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000');
    
    if (user && (user.id || user._id)) {
      socket.emit('join_provider_room', user.id || user._id);
    }
    
    socket.on('new_package_booking', (data) => {
      setNotifications(prev => [data, ...prev]);
      if (data.booking) {
        setBookings(prev => [data.booking, ...prev]);
        setToast(data.message || 'New package booking received!');
        setTimeout(() => setToast(null), 6000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get Agency Profile
      const agencyRes = await agencyAPI.getMyAgency();
      const agencyData = agencyRes.data.agency;
      setAgencyProfile(agencyData);
      
      if (agencyData) {
        setProfileForm({
          agencyName: agencyData.agencyName || '',
          description: agencyData.description || '',
          phone: agencyData.phone || '',
          website: agencyData.website || '',
          location: {
            country: agencyData.location?.country || '',
            city: agencyData.location?.city || '',
            address: agencyData.location?.address || ''
          },
          priceRange: {
            min: agencyData.priceRange?.min || 0,
            max: agencyData.priceRange?.max || 0
          },
          specialties: agencyData.specialties ? agencyData.specialties.join(', ') : ''
        });

        if (agencyData.logo) setLogoPreview(`http://localhost:5000${agencyData.logo}`);
        if (agencyData.coverImage) setCoverPreview(`http://localhost:5000${agencyData.coverImage}`);

        // 2. Fetch Packages for this agency (using agency.userId._id)
        const providerId = agencyData.userId._id || agencyData.userId;
        const pkgsRes = await agencyAPI.getPackages(providerId);
        setPackages(pkgsRes.data.packages || []);

        // 3. Fetch Reviews for this provider
        const reviewsRes = await reviewAPI.getByProvider(providerId);
        setReviews(reviewsRes.data.reviews || []);
      }

      // 4. Fetch Bookings for this agency
      const bookingsRes = await bookingAPI.getMyBookings();
      setBookings(bookingsRes.data.bookings || []);

      // 5. Fetch Guides for this agency
      const guidesRes = await guideAPI.getMyGuides();
      setGuides(guidesRes.data.guides || []);

    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingStatus = async (bookingId, status) => {
    try {
      await bookingAPI.updateStatus(bookingId, { status });
      // Update local state
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    try {
      const formData = new FormData();
      formData.append('agencyName', profileForm.agencyName);
      formData.append('description', profileForm.description);
      formData.append('phone', profileForm.phone);
      formData.append('website', profileForm.website);
      formData.append('location[country]', profileForm.location.country);
      formData.append('location[city]', profileForm.location.city);
      formData.append('location[address]', profileForm.location.address);
      formData.append('priceRange[min]', profileForm.priceRange.min);
      formData.append('priceRange[max]', profileForm.priceRange.max);
      formData.append('specialties', profileForm.specialties);
      
      if (logoFile) formData.append('logo', logoFile);
      if (coverFile) formData.append('coverImage', coverFile);

      const response = await agencyAPI.update(agencyProfile._id, formData);
      if (response.data.success) {
        setProfileSuccess('Profile updated successfully!');
        setAgencyProfile(response.data.agency);
      }
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  const handleSubmitPackage = async (e) => {
    e.preventDefault();
    setPkgSuccess('');
    try {
      const formData = new FormData();
      formData.append('packageName', newPkgForm.packageName);
      formData.append('description', newPkgForm.description);
      formData.append('destination_country', newPkgForm.destination_country);
      formData.append('destination_city', newPkgForm.destination_city);
      formData.append('duration_days', newPkgForm.duration_days);
      formData.append('duration_nights', newPkgForm.duration_nights);
      formData.append('pricePerPerson', newPkgForm.pricePerPerson);
      formData.append('maxGroupSize', newPkgForm.maxGroupSize);
      formData.append('included', newPkgForm.included);
      
      if (pkgImages.length > 0) {
        for (let i = 0; i < pkgImages.length; i++) {
          formData.append('images', pkgImages[i]);
        }
      }

      if (editMode) {
        await agencyAPI.updatePackage(editingPkgId, formData);
        setPkgSuccess('Package updated successfully!');
      } else {
        await agencyAPI.createPackage(formData);
        setPkgSuccess('Package added successfully!');
      }
      
      // Reset Form
      setNewPkgForm({
        packageName: '',
        description: '',
        destination_country: '',
        destination_city: '',
        duration_days: 1,
        duration_nights: 0,
        pricePerPerson: 100,
        included: '',
        maxGroupSize: 10
      });
      setPkgImages([]);

      setEditingPkgId(null);
      setEditMode(false);

      // Refresh Packages
      const providerId = agencyProfile.userId._id || agencyProfile.userId;
      const pkgsRes = await agencyAPI.getPackages(providerId);
      setPackages(pkgsRes.data.packages || []);

      setTimeout(() => setPkgSuccess(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save package');
    }
  };

  const handleEditPackageClick = (pkg) => {
    setEditMode(true);
    setEditingPkgId(pkg._id);
    setNewPkgForm({
      packageName: pkg.packageName,
      description: pkg.description,
      destination_country: pkg.destination_country,
      destination_city: pkg.destination_city,
      duration_days: pkg.duration_days,
      duration_nights: pkg.duration_nights,
      pricePerPerson: pkg.pricePerPerson,
      included: pkg.included ? (Array.isArray(pkg.included) ? pkg.included.join(', ') : pkg.included) : '',
      maxGroupSize: pkg.maxGroupSize
    });
    setPkgImages([]);
    setActiveTab('packages');
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditingPkgId(null);
    setNewPkgForm({
      packageName: '', description: '', destination_country: '', destination_city: '', duration_days: 1, duration_nights: 0, pricePerPerson: 100, included: '', maxGroupSize: 10
    });
    setPkgImages([]);
  };

  const handleDeletePackage = async (packageId) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      await agencyAPI.deletePackage(packageId);
      setPackages(prev => prev.filter(p => p._id !== packageId));
    } catch (err) {
      alert('Failed to delete package');
    }
  };

  const handleSubmitGuide = async (e) => {
    e.preventDefault();
    setGuideSuccess('');
    try {
      if (guideEditMode) {
        const res = await guideAPI.update(editingGuideId, newGuideForm);
        if (res.data.success) {
          setGuideSuccess('Guide updated successfully!');
          setGuides(prev => prev.map(g => g._id === editingGuideId ? res.data.guide : g));
          setNewGuideForm({ name: '', email: '', phone: '', status: 'Active' });
          setGuideEditMode(false);
          setEditingGuideId(null);
        }
      } else {
        const res = await guideAPI.create(newGuideForm);
        if (res.data.success) {
          setGuideSuccess('Guide registered successfully!');
          setGuides(prev => [res.data.guide, ...prev]);
          setNewGuideForm({ name: '', email: '', phone: '', status: 'Active' });
        }
      }
      setTimeout(() => setGuideSuccess(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save guide');
    }
  };

  const handleEditGuideClick = (g) => {
    setGuideEditMode(true);
    setEditingGuideId(g._id);
    setNewGuideForm({
      name: g.name,
      email: g.email,
      phone: g.phone,
      status: g.status || 'Active'
    });
    setActiveTab('guides');
  };

  const handleCancelGuideEdit = () => {
    setNewGuideForm({ name: '', email: '', phone: '', status: 'Active' });
    setGuideEditMode(false);
    setEditingGuideId(null);
  };

  const handleDeleteGuide = async (guideId) => {
    if (!window.confirm('Are you sure you want to delete this guide?')) return;
    try {
      const res = await guideAPI.delete(guideId);
      if (res.data.success) {
        setGuides(prev => prev.filter(g => g._id !== guideId));
      }
    } catch (err) {
      alert('Failed to delete guide');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  // Compile Bookings Data by Month for SVG Graph
  const getAnalyticsData = () => {
    // Months mapping
    const counts = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 };
    bookings.forEach(b => {
      if (b.status === 'Cancelled') return;
      const d = new Date(b.bookingDate || b.createdAt);
      const m = d.toLocaleString('default', { month: 'short' });
      if (counts[m] !== undefined) {
        counts[m]++;
      }
    });

    const data = Object.keys(counts).map(key => ({
      month: key,
      bookings: counts[key]
    }));

    return data;
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
  const maxBookings = Math.max(...chartData.map(d => d.bookings), 5); // baseline of 5

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="text-xl">🔔</span>
          <div>
            <p className="font-bold text-sm">Notification</p>
            <p className="text-xs">{toast}</p>
          </div>
          <button onClick={() => setToast(null)} className="ml-4 text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-extrabold text-black tracking-tight mb-8">Agency Portal</h2>
          
          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setActiveTab('bookings');
                setNotifications([]);
              }}
              className={`relative w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'bookings' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
            >
              📅 Bookings ({bookings.length})
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
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'profile' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
            >
              🏢 Update Profile
            </button>

            <button
              onClick={() => setActiveTab('packages')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'packages' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
            >
              🎒 Manage Packages
            </button>

            <button
              onClick={() => setActiveTab('guides')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'guides' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
            >
              👤 Manage Guides
            </button>
            
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'analytics' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
            >
              📈 Booking Analytics
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

      {/* Main Content Area */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 capitalize">{activeTab} Manager</h1>
            <p className="text-sm text-gray-500 mt-1">Hello, {user?.name}. Manage your packages, reviews and bookings.</p>
          </div>
          {agencyProfile?.logo && (
            <img
              src={`http://localhost:5000${agencyProfile.logo}`}
              alt="Logo"
              className="w-12 h-12 rounded-full border border-gray-200 object-cover"
            />
          )}
        </header>

        {/* Tab content conditional rendering */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Current Bookings List</h3>
            {bookings.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No bookings found for your agency packages.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase">
                    <tr>
                      <th className="p-4 rounded-l-lg">Booking No</th>
                      <th className="p-4">Traveler Details</th>
                      <th className="p-4">Package Name</th>
                      <th className="p-4">Guide</th>
                      <th className="p-4">Travel Date</th>
                      <th className="p-4">Total Price</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 rounded-r-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map((b) => (
                      <tr key={b._id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-mono text-xs font-semibold text-gray-900">{b.bookingNumber}</td>
                        <td className="p-4">
                          <div className="text-sm font-semibold text-black">{b.travelerId?.name}</div>
                          <div className="text-xs text-gray-400">{b.travelerId?.email} | {b.travelerId?.phone}</div>
                        </td>
                        <td className="p-4 font-semibold text-gray-900">
                          {b.packageOrServiceId?.packageName || 'Deleted Package'}
                        </td>
                        <td className="p-4">
                          {b.assignedGuideId ? (
                            <div>
                              <div className="text-sm font-semibold text-black">{b.assignedGuideId.name}</div>
                              <div className="text-xs text-gray-400">{b.assignedGuideId.email}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Not Assigned</span>
                          )}
                        </td>
                        <td className="p-4 text-xs">
                          {new Date(b.bookingDate).toLocaleDateString()}
                          <span className="block text-[10px] text-gray-400 mt-0.5">{b.numberOfPeople} People</span>
                        </td>
                        <td className="p-4 font-bold text-black">${b.totalPrice}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'Confirmed' ? 'bg-green-100 text-green-800' : b.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {b.status}
                          </span>
                          <span className="block text-[9px] text-gray-400 mt-1 uppercase">Pay: {b.paymentStatus}</span>
                        </td>
                        <td className="p-4">
                          {b.status === 'Pending' && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleBookingStatus(b._id, 'Confirmed')}
                                className="px-3 py-1 bg-green-500 text-white rounded text-[10px] font-bold hover:bg-green-600 transition"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleBookingStatus(b._id, 'Cancelled')}
                                className="px-3 py-1 bg-red-500 text-white rounded text-[10px] font-bold hover:bg-red-600 transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {b.status === 'Confirmed' && (
                            <button
                              onClick={() => handleBookingStatus(b._id, 'Cancelled')}
                              className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-[10px] font-bold hover:bg-gray-300 transition"
                            >
                              Cancel Booking
                            </button>
                          )}
                          {b.status === 'Cancelled' && (
                            <span className="text-xs text-gray-400 italic">No actions</span>
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
            <h3 className="text-lg font-bold text-gray-900">Traveler Feedback</h3>
            {reviews.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No reviews submitted yet for your agency.</p>
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
                      <p className="text-gray-600 text-xs mt-1.5 leading-relaxed">{rev.comment}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-200/60 text-[9px] text-gray-500 font-medium">
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

        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Update Agency Settings</h3>
            
            {profileSuccess && (
              <div className="p-3 bg-green-50 text-green-800 rounded border border-green-200 mb-6 text-sm text-center">
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              
              {/* Image Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-100">
                
                {/* Logo File */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Agency Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🏢</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setLogoFile(file);
                          setLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Cover File */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cover Banner</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 rounded bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🖼️</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setCoverFile(file);
                          setCoverPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>

              </div>

              {/* Form Input fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Agency Business Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    value={profileForm.agencyName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, agencyName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Phone Line</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Website URL</label>
                  <input
                    type="text"
                    placeholder="e.g. www.vacations.com"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    value={profileForm.website}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Specialties (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. beach, adventure, luxury"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    value={profileForm.specialties}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, specialties: e.target.value }))}
                  />
                </div>
              </div>

              {/* Address Nested fields */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Country</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    value={profileForm.location.country}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: { ...prev.location, country: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">City</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    value={profileForm.location.city}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: { ...prev.location, city: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Street Address</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    value={profileForm.location.address}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: { ...prev.location, address: e.target.value } }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Business Description</label>
                <textarea
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  rows="4"
                  value={profileForm.description}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-black text-white hover:bg-gray-800 rounded font-semibold text-sm transition"
              >
                Save Agency Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'packages' && (
          <div className="space-y-8">
            
            {/* Create package form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6">{editMode ? 'Edit Travel Package' : 'Add New Travel Package'}</h3>
              
              {pkgSuccess && (
                <div className="p-3 bg-green-50 text-green-800 rounded border border-green-200 mb-6 text-sm text-center">
                  {pkgSuccess}
                </div>
              )}

              <form onSubmit={handleSubmitPackage} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Package Name</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newPkgForm.packageName}
                      onChange={(e) => setNewPkgForm(prev => ({ ...prev, packageName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Price Per Person ($)</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newPkgForm.pricePerPerson}
                      onChange={(e) => setNewPkgForm(prev => ({ ...prev, pricePerPerson: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Destination Country</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newPkgForm.destination_country}
                      onChange={(e) => setNewPkgForm(prev => ({ ...prev, destination_country: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Destination City</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newPkgForm.destination_city}
                      onChange={(e) => setNewPkgForm(prev => ({ ...prev, destination_city: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Duration Days</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newPkgForm.duration_days}
                      onChange={(e) => setNewPkgForm(prev => ({ ...prev, duration_days: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Duration Nights</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newPkgForm.duration_nights}
                      onChange={(e) => setNewPkgForm(prev => ({ ...prev, duration_nights: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Max Group Size</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newPkgForm.maxGroupSize}
                      onChange={(e) => setNewPkgForm(prev => ({ ...prev, maxGroupSize: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Inclusions (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Flight, Lodging, Meals"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newPkgForm.included}
                      onChange={(e) => setNewPkgForm(prev => ({ ...prev, included: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Package Images (Multer)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setPkgImages(Array.from(e.target.files))}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Package description</label>
                  <textarea
                    rows="3"
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                    value={newPkgForm.description}
                    onChange={(e) => setNewPkgForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-black text-white hover:bg-gray-800 rounded font-semibold text-xs transition"
                  >
                    {editMode ? 'Update Package' : 'Create Package'}
                  </button>
                  {editMode && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-6 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded font-semibold text-xs transition"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List packages */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Active Agency Packages ({packages.length})</h3>
              {packages.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No active travel packages created yet.</p>
              ) : (
                <div className="space-y-3">
                  {packages.map(p => (
                    <div key={p._id} className="p-4 border border-gray-100 rounded-lg flex justify-between items-center bg-gray-50/50">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{p.packageName}</h4>
                        <p className="text-xs text-gray-500">{p.duration_days} Days / {p.duration_nights} Nights • ${p.pricePerPerson} per person</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditPackageClick(p)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePackage(p._id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'guides' && (
          <div className="space-y-8">
            {/* Create guide form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6">{guideEditMode ? 'Edit Guide Profile' : 'Add New Travel Guide'}</h3>
              
              {guideSuccess && (
                <div className="p-3 bg-green-50 text-green-800 rounded border border-green-200 mb-6 text-sm text-center">
                  {guideSuccess}
                </div>
              )}

              <form onSubmit={handleSubmitGuide} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Guide Name</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newGuideForm.name}
                      onChange={(e) => setNewGuideForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newGuideForm.email}
                      onChange={(e) => setNewGuideForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newGuideForm.phone}
                      onChange={(e) => setNewGuideForm(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Status</label>
                    <select
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none"
                      value={newGuideForm.status}
                      onChange={(e) => setNewGuideForm(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-black text-white hover:bg-gray-800 rounded font-semibold text-xs transition"
                  >
                    {guideEditMode ? 'Update Guide' : 'Register Guide'}
                  </button>
                  {guideEditMode && (
                    <button
                      type="button"
                      onClick={handleCancelGuideEdit}
                      className="px-6 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded font-semibold text-xs transition"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List guides */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Active & Registered Guides ({guides.length})</h3>
              {guides.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No registered travel guides created yet.</p>
              ) : (
                <div className="space-y-3">
                  {guides.map(g => (
                    <div key={g._id} className="p-4 border border-gray-100 rounded-lg flex justify-between items-center bg-gray-50/50">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{g.name}</h4>
                        <p className="text-xs text-gray-500">Email: {g.email} • Phone: {g.phone} • Status: <span className={g.status === 'Active' ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{g.status}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditGuideClick(g)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteGuide(g._id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-3xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Bookings Over Time</h3>
            <p className="text-xs text-gray-400 mb-8">Monthly visualization of active/completed travel package bookings.</p>
            
            {/* Custom SVG Bar Chart */}
            <div className="w-full flex flex-col items-center">
              <svg viewBox="0 0 600 300" className="w-full max-w-[550px] overflow-visible">
                {/* Horizontal gridlines */}
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

                {/* Bars */}
                {chartData.map((d, index) => {
                  const width = 30;
                  const spacing = 43;
                  const x = 50 + index * spacing;
                  const barHeight = (d.bookings / maxBookings) * 200;
                  const y = 220 - barHeight;

                  return (
                    <g key={index} className="group cursor-pointer">
                      {/* Bar fill */}
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={barHeight}
                        rx="4"
                        className="fill-black group-hover:fill-indigo-600 transition-colors duration-200"
                      />
                      {/* Tooltip value */}
                      <text
                        x={x + width / 2}
                        y={y - 8}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-black opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        {d.bookings}
                      </text>
                      {/* X label */}
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
                
                {/* Axis line */}
                <line x1="40" y1="220" x2="560" y2="220" stroke="#e5e7eb" strokeWidth="1.5" />
              </svg>
              
              <div className="mt-8 text-center text-xs text-gray-500 font-semibold flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 bg-black rounded"></span>
                  <span>Number of Package Bookings</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
