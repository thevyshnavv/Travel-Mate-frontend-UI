import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { taxiAPI, bookingAPI, reviewAPI } from '../services/api';

const VEHICLE_ICONS = {
  sedan: '🚗',
  suv: '🚙',
  minivan: '🚐',
  luxury: '🏎️',
  bus: '🚌',
};

export default function BrowseTaxis() {
  const { token, user } = useSelector((state) => state.auth);
  const [taxis, setTaxis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search Filters
  const [filters, setFilters] = useState({ country: '', city: '', vehicleType: '' });

  // Selected Taxi Details Modal
  const [selectedTaxi, setSelectedTaxi] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Booking form state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({
    pickupLocation: '',
    dropoffLocation: '',
    bookingDate: '',
    tripDistance: '',
    numberOfPeople: 1,
    vehiclePreference: '',
    specialRequests: '',
    paymentMethod: 'Cash',
  });
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  // Review form state
  const [reviewFormData, setReviewFormData] = useState({
    bookingId: '',
    rating: 5,
    title: '',
    comment: '',
    cleanliness_rating: 5,
    comfort_rating: 5,
    professionalism_rating: 5,
  });
  const [reviewSuccess, setReviewSuccess] = useState(null);

  useEffect(() => {
    fetchTaxis();
  }, []);

  const fetchTaxis = async (searchFilters = filters) => {
    setLoading(true);
    try {
      const clean = Object.fromEntries(Object.entries(searchFilters).filter(([, v]) => v !== ''));
      const response = await taxiAPI.getAll(clean);
      setTaxis(response.data.taxiProviders || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch taxi providers.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchTaxis(filters);
  };

  const handleClearFilters = () => {
    const cleared = { country: '', city: '', vehicleType: '' };
    setFilters(cleared);
    fetchTaxis(cleared);
  };

  const handleViewDetails = async (taxi) => {
    setSelectedTaxi(taxi);
    setLoadingDetails(true);
    setShowBookingForm(false);
    setBookingSuccess(null);
    setBookingError(null);
    setReviewSuccess(null);
    setBookingFormData({
      pickupLocation: '',
      dropoffLocation: '',
      bookingDate: '',
      tripDistance: '',
      numberOfPeople: 1,
      vehiclePreference: taxi.vehicleTypes?.[0] || '',
      specialRequests: '',
      paymentMethod: 'Cash',
    });
    setReviewFormData({
      bookingId: '',
      rating: 5,
      title: '',
      comment: '',
      cleanliness_rating: 5,
      comfort_rating: 5,
      professionalism_rating: 5,
    });

    try {
      const providerId = taxi.userId?._id || taxi.userId;
      const reviewsRes = await reviewAPI.getByProvider(providerId);
      setReviews(reviewsRes.data.reviews || []);

      if (token && user?.role === 'traveler') {
        const bookingsRes = await bookingAPI.getMyBookings();
        const myTaxiBookings = (bookingsRes.data.bookings || []).filter(
          b => b.bookingType === 'taxi' &&
               (b.packageOrServiceId?._id || b.packageOrServiceId)?.toString() === taxi._id?.toString()
        );
        setUserBookings(myTaxiBookings);
        if (myTaxiBookings.length > 0) {
          setReviewFormData(prev => ({ ...prev, bookingId: myTaxiBookings[0]._id }));
        }
      }
    } catch (err) {
      console.error('Error fetching taxi details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const computeTotalPrice = () => {
    const dist = parseFloat(bookingFormData.tripDistance) || 0;
    const base = selectedTaxi?.basePrice || 0;
    const perKm = selectedTaxi?.pricePerKm || 0;
    return base + dist * perKm;
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setBookingError(null);
    const totalPrice = computeTotalPrice();
    if (totalPrice <= 0) {
      setBookingError('Please enter a valid trip distance to calculate the fare.');
      return;
    }
    try {
      const payload = {
        bookingType: 'taxi',
        packageOrServiceId: selectedTaxi._id,
        bookingDate: bookingFormData.bookingDate,
        totalPrice,
        numberOfPeople: Number(bookingFormData.numberOfPeople),
        specialRequests: [
          bookingFormData.pickupLocation && `Pickup: ${bookingFormData.pickupLocation}`,
          bookingFormData.dropoffLocation && `Dropoff: ${bookingFormData.dropoffLocation}`,
          bookingFormData.vehiclePreference && `Vehicle: ${bookingFormData.vehiclePreference}`,
          bookingFormData.specialRequests,
        ].filter(Boolean).join(' | '),
        paymentMethod: bookingFormData.paymentMethod,
      };
      await bookingAPI.create(payload);
      setBookingSuccess('Booking request submitted successfully!');
      setTimeout(() => {
        setShowBookingForm(false);
        setBookingSuccess(null);
        handleViewDetails(selectedTaxi);
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Booking failed');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewFormData.bookingId) {
      alert('Please select a booking to review.');
      return;
    }
    try {
      await reviewAPI.create(reviewFormData);
      setReviewSuccess('Review submitted successfully!');
      const providerId = selectedTaxi.userId?._id || selectedTaxi.userId;
      const reviewsRes = await reviewAPI.getByProvider(providerId);
      setReviews(reviewsRes.data.reviews || []);
      setTimeout(() => setReviewSuccess(null), 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const r = Math.round(rating || 0);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= r ? 'text-yellow-400 text-lg' : 'text-gray-300 text-lg'}>★</span>
      );
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Title */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            Browse Taxi Providers
          </h1>
          <p className="text-lg text-gray-600">
            Find verified taxi services, view fleets, compare pricing, and book your ride.
          </p>
        </div>

        {/* Filters */}
        <form onSubmit={handleFilterSubmit} className="bg-white p-6 rounded-xl shadow-md mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Country</label>
            <input
              type="text"
              name="country"
              value={filters.country}
              onChange={handleFilterChange}
              placeholder="e.g. Sri Lanka"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">City</label>
            <input
              type="text"
              name="city"
              value={filters.city}
              onChange={handleFilterChange}
              placeholder="e.g. Colombo"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Vehicle Type</label>
            <select
              name="vehicleType"
              value={filters.vehicleType}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="">All Types</option>
              {['sedan', 'suv', 'minivan', 'luxury', 'bus'].map(t => (
                <option key={t} value={t}>{VEHICLE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Search
            </button>
            {(filters.country || filters.city || filters.vehicleType) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Taxi Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading taxi providers...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        ) : taxis.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-lg">No taxi providers found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {taxis.map((taxi) => (
              <div key={taxi._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300 flex flex-col h-full border border-gray-100">

                {/* Card Header Banner */}
                <div className="h-32 bg-gradient-to-r from-gray-700 to-gray-900 relative flex items-center justify-center">
                  <span className="text-5xl">🚖</span>
                  {taxi.availability && (
                    <span className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Available
                    </span>
                  )}
                  {taxi.isVerified && (
                    <span className="absolute top-3 left-3 bg-white text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{taxi.businessName}</h3>

                    {/* Rating */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="flex">{renderStars(taxi.rating)}</div>
                      <span className="text-sm font-semibold text-gray-700">({(taxi.rating || 0).toFixed(1)})</span>
                      <span className="text-xs text-gray-400">• {taxi.reviewCount || 0} reviews</span>
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {taxi.description || 'No description provided.'}
                    </p>

                    {/* Vehicle types */}
                    {taxi.vehicleTypes?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {taxi.vehicleTypes.slice(0, 4).map((v, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded">
                            {VEHICLE_ICONS[v] || '🚗'} {v}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1 mb-6">
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        📍 {taxi.location?.city ? `${taxi.location.city}, ${taxi.location.country}` : 'Location not specified'}
                      </div>
                      <div className="text-xs text-gray-500">
                        📞 {taxi.phone}
                      </div>
                      {taxi.basePrice > 0 && (
                        <div className="text-xs text-gray-500">
                          💰 From ${taxi.basePrice}
                          {taxi.pricePerKm > 0 && ` + $${taxi.pricePerKm}/km`}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewDetails(taxi)}
                    className="w-full py-2.5 border border-black rounded-lg text-sm font-semibold hover:bg-black hover:text-white transition duration-200"
                  >
                    View Details &amp; Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Taxi Detail Modal */}
        {selectedTaxi && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">

              {/* Close Button */}
              <button
                onClick={() => setSelectedTaxi(null)}
                className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full w-8 h-8 flex items-center justify-center font-bold transition"
              >
                ✕
              </button>

              <div className="p-6 md:p-8">
                {/* Taxi Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                    🚖
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">{selectedTaxi.businessName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-gray-700">Rating: {(selectedTaxi.rating || 0).toFixed(1)}/5</span>
                      <span className="text-yellow-400">★</span>
                      <span className="text-xs text-gray-400">({selectedTaxi.reviewCount || 0} reviews)</span>
                      {selectedTaxi.isVerified && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Verified</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* About */}
                <div className="border-b border-gray-100 pb-6 mb-6">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">About</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {selectedTaxi.description || 'No description provided.'}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-xs text-gray-500">
                    <div>📍 {selectedTaxi.location?.city}{selectedTaxi.location?.country ? `, ${selectedTaxi.location.country}` : ''}</div>
                    <div>📞 {selectedTaxi.phone}</div>
                    {selectedTaxi.email && <div>✉️ {selectedTaxi.email}</div>}
                    {selectedTaxi.basePrice > 0 && <div>💰 Base: ${selectedTaxi.basePrice}</div>}
                    {selectedTaxi.pricePerKm > 0 && <div>📏 ${selectedTaxi.pricePerKm}/km</div>}
                    {selectedTaxi.operatingHours?.open && (
                      <div>🕐 {selectedTaxi.operatingHours.open} – {selectedTaxi.operatingHours.close}</div>
                    )}
                  </div>
                  {selectedTaxi.serviceArea?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {selectedTaxi.serviceArea.map((area, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded">{area}</span>
                      ))}
                    </div>
                  )}
                </div>

                {loadingDetails ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                    <p className="text-xs text-gray-400 mt-2">Loading details...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left: Fleet, Drivers, Reviews */}
                    <div className="lg:col-span-2 space-y-6">

                      {/* Fleet */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2">
                          Fleet ({selectedTaxi.vehicles?.length || 0})
                        </h3>
                        {!selectedTaxi.vehicles?.length ? (
                          <p className="text-sm text-gray-400 italic mt-2">No vehicles listed yet.</p>
                        ) : (
                          <div className="space-y-3 mt-3">
                            {selectedTaxi.vehicles.map((v, i) => (
                              <div key={i} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex items-center gap-4">
                                <span className="text-3xl">{VEHICLE_ICONS[v.type] || '🚗'}</span>
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 text-sm">{v.model || 'Unknown Model'}</h4>
                                  <p className="text-xs text-gray-500">{v.registrationNumber}</p>
                                </div>
                                <div className="text-right text-xs text-gray-500 space-y-0.5">
                                  {v.type && <div className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded">{v.type}</div>}
                                  {v.capacity && <div>{v.capacity} seats</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Drivers */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2">
                          Drivers ({selectedTaxi.drivers?.length || 0})
                        </h3>
                        {!selectedTaxi.drivers?.length ? (
                          <p className="text-sm text-gray-400 italic mt-2">No drivers listed yet.</p>
                        ) : (
                          <div className="space-y-3 mt-3">
                            {selectedTaxi.drivers.map((d, i) => (
                              <div key={i} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-sm uppercase text-gray-600">
                                  {d.name?.substring(0, 2) || 'DR'}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 text-sm">{d.name || 'Driver'}</h4>
                                  <p className="text-xs text-gray-500">📞 {d.phone}</p>
                                </div>
                                {d.experience != null && (
                                  <span className="text-xs text-gray-500">{d.experience} yrs exp</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reviews */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2 pt-4">
                          Reviews ({reviews.length})
                        </h3>
                        {reviews.length === 0 ? (
                          <p className="text-sm text-gray-400 italic mt-2">No reviews submitted yet. Be the first to review!</p>
                        ) : (
                          <div className="space-y-4 mt-3">
                            {reviews.map((rev) => (
                              <div key={rev._id} className="p-4 border border-gray-100 rounded-xl">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold text-xs uppercase text-gray-600">
                                      {rev.reviewerId?.name?.substring(0, 2) || 'TR'}
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-sm text-gray-900">{rev.reviewerId?.name || 'Traveler'}</h5>
                                      <div className="flex gap-0.5">{renderStars(rev.rating)}</div>
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {new Date(rev.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {rev.title && <h6 className="font-semibold text-gray-900 mt-2 text-sm">"{rev.title}"</h6>}
                                <p className="text-gray-600 text-xs mt-1 leading-relaxed">{rev.comment}</p>
                                <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-gray-50 text-[10px] text-gray-500">
                                  <div>🧹 Cleanliness: {rev.cleanliness_rating}/5</div>
                                  <div>💺 Comfort: {rev.comfort_rating}/5</div>
                                  <div>💼 Professionalism: {rev.professionalism_rating}/5</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Booking + Review form panel */}
                    <div className="space-y-6">

                      {/* Booking Form */}
                      {token && user?.role === 'traveler' && (
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                          <h4 className="font-bold text-gray-900 text-base mb-3">Book This Taxi</h4>

                          {bookingSuccess ? (
                            <div className="p-3 bg-green-100 text-green-800 rounded border border-green-200 text-xs text-center font-semibold">
                              {bookingSuccess}
                            </div>
                          ) : (
                            <>
                              {!showBookingForm ? (
                                <button
                                  onClick={() => setShowBookingForm(true)}
                                  className="w-full py-2.5 bg-black text-white font-semibold rounded hover:bg-gray-800 text-sm transition"
                                >
                                  Book Now
                                </button>
                              ) : (
                                <form onSubmit={handleBookSubmit} className="space-y-3">
                                  {bookingError && (
                                    <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded text-xs">
                                      {bookingError}
                                    </div>
                                  )}
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Pickup Location</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="e.g. Colombo Airport"
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                      value={bookingFormData.pickupLocation}
                                      onChange={e => setBookingFormData(prev => ({ ...prev, pickupLocation: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Drop-off Location</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="e.g. Galle Fort"
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                      value={bookingFormData.dropoffLocation}
                                      onChange={e => setBookingFormData(prev => ({ ...prev, dropoffLocation: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Date &amp; Time</label>
                                    <input
                                      type="datetime-local"
                                      required
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                      value={bookingFormData.bookingDate}
                                      onChange={e => setBookingFormData(prev => ({ ...prev, bookingDate: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Distance (km)</label>
                                    <input
                                      type="number"
                                      min="1"
                                      required
                                      placeholder="e.g. 120"
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                      value={bookingFormData.tripDistance}
                                      onChange={e => setBookingFormData(prev => ({ ...prev, tripDistance: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Passengers</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="50"
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                      value={bookingFormData.numberOfPeople}
                                      onChange={e => setBookingFormData(prev => ({ ...prev, numberOfPeople: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Vehicle Preference</label>
                                    <select
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                      value={bookingFormData.vehiclePreference}
                                      onChange={e => setBookingFormData(prev => ({ ...prev, vehiclePreference: e.target.value }))}
                                    >
                                      <option value="">No preference</option>
                                      {(selectedTaxi.vehicleTypes || []).map(vt => (
                                        <option key={vt} value={vt}>{VEHICLE_ICONS[vt] || '🚗'} {vt.charAt(0).toUpperCase() + vt.slice(1)}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Payment Method</label>
                                    <select
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                      value={bookingFormData.paymentMethod}
                                      onChange={e => setBookingFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                    >
                                      {['Cash', 'Card', 'Bank Transfer', 'Online Payment'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Special Requests</label>
                                    <textarea
                                      placeholder="e.g. Baby seat, wheelchair access..."
                                      rows="2"
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-black"
                                      value={bookingFormData.specialRequests}
                                      onChange={e => setBookingFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                                    />
                                  </div>

                                  {/* Price estimate */}
                                  {bookingFormData.tripDistance > 0 && (
                                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-sm font-bold text-black">
                                      <span>Estimated Fare:</span>
                                      <span>${computeTotalPrice().toFixed(2)}</span>
                                    </div>
                                  )}

                                  <div className="flex gap-2 pt-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowBookingForm(false)}
                                      className="flex-1 py-2 bg-gray-200 text-gray-700 font-semibold rounded hover:bg-gray-300 text-xs transition"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="flex-1 py-2 bg-black text-white font-semibold rounded hover:bg-gray-800 text-xs transition"
                                    >
                                      Confirm Book
                                    </button>
                                  </div>
                                </form>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Review Form */}
                      {token && user?.role === 'traveler' && !showBookingForm && (
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                          <h4 className="font-bold text-gray-900 text-base mb-3">Leave a Review</h4>

                          {userBookings.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">
                              You can only review a taxi provider after booking their service.
                            </p>
                          ) : (
                            <>
                              {reviewSuccess ? (
                                <div className="p-3 bg-green-100 text-green-800 rounded border border-green-200 text-xs text-center font-semibold">
                                  {reviewSuccess}
                                </div>
                              ) : (
                                <form onSubmit={handleReviewSubmit} className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Select Booking</label>
                                    <select
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-black"
                                      value={reviewFormData.bookingId}
                                      onChange={e => setReviewFormData(prev => ({ ...prev, bookingId: e.target.value }))}
                                      required
                                    >
                                      {userBookings.map(b => (
                                        <option key={b._id} value={b._id}>
                                          {b.bookingNumber} (${b.totalPrice})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Overall Rating</label>
                                    <select
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                                      value={reviewFormData.rating}
                                      onChange={e => setReviewFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                                    >
                                      <option value="5">5 - Excellent ★★★★★</option>
                                      <option value="4">4 - Good ★★★★</option>
                                      <option value="3">3 - Average ★★★</option>
                                      <option value="2">2 - Poor ★★</option>
                                      <option value="1">1 - Terrible ★</option>
                                    </select>
                                  </div>

                                  {/* Sub-ratings */}
                                  <div className="grid grid-cols-1 gap-2 border-t border-b border-gray-100 py-2">
                                    <div className="flex justify-between items-center text-xs">
                                      <span>🧹 Cleanliness:</span>
                                      <input
                                        type="range" min="1" max="5"
                                        value={reviewFormData.cleanliness_rating}
                                        onChange={e => setReviewFormData(prev => ({ ...prev, cleanliness_rating: Number(e.target.value) }))}
                                        className="w-20"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span>💺 Comfort:</span>
                                      <input
                                        type="range" min="1" max="5"
                                        value={reviewFormData.comfort_rating}
                                        onChange={e => setReviewFormData(prev => ({ ...prev, comfort_rating: Number(e.target.value) }))}
                                        className="w-20"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span>💼 Professionalism:</span>
                                      <input
                                        type="range" min="1" max="5"
                                        value={reviewFormData.professionalism_rating}
                                        onChange={e => setReviewFormData(prev => ({ ...prev, professionalism_rating: Number(e.target.value) }))}
                                        className="w-20"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Title</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Great ride!"
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                                      value={reviewFormData.title}
                                      onChange={e => setReviewFormData(prev => ({ ...prev, title: e.target.value }))}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Comment</label>
                                    <textarea
                                      rows="3"
                                      placeholder="Share your experience..."
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                                      value={reviewFormData.comment}
                                      onChange={e => setReviewFormData(prev => ({ ...prev, comment: e.target.value }))}
                                      required
                                    />
                                  </div>

                                  <button
                                    type="submit"
                                    className="w-full py-2 bg-black text-white font-semibold rounded text-xs hover:bg-gray-800 transition"
                                  >
                                    Submit Review
                                  </button>
                                </form>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
