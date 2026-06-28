import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { agencyAPI, bookingAPI, reviewAPI } from '../services/api';

export default function BrowseAgencies() {
  const { token, user } = useSelector((state) => state.auth);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search Filters
  const [filters, setFilters] = useState({ country: '', city: '' });
  
  // Selected Agency Details Modal
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [packages, setPackages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // New Booking Form State
  const [bookingPackage, setBookingPackage] = useState(null);
  const [bookingFormData, setBookingFormData] = useState({
    bookingDate: '',
    numberOfPeople: 1,
    specialRequests: '',
    paymentMethod: 'Card'
  });
  const [bookingSuccess, setBookingSuccess] = useState(null);
  
  // New Review Form State
  const [reviewFormData, setReviewFormData] = useState({
    bookingId: '',
    rating: 5,
    title: '',
    comment: '',
    cleanliness_rating: 5,
    comfort_rating: 5,
    professionalism_rating: 5
  });
  const [reviewSuccess, setReviewSuccess] = useState(null);

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async (searchFilters = filters) => {
    setLoading(true);
    try {
      // Get all verified agencies
      const response = await agencyAPI.getAll(searchFilters);
      setAgencies(response.data.agencies || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch travel agencies.');
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
    fetchAgencies(filters);
  };

  const handleClearFilters = () => {
    const cleared = { country: '', city: '' };
    setFilters(cleared);
    fetchAgencies(cleared);
  };

  const handleViewDetails = async (agency) => {
    setSelectedAgency(agency);
    setLoadingDetails(true);
    setBookingPackage(null);
    setBookingSuccess(null);
    setReviewSuccess(null);
    
    // Reset review form
    setReviewFormData({
      bookingId: '',
      rating: 5,
      title: '',
      comment: '',
      cleanliness_rating: 5,
      comfort_rating: 5,
      professionalism_rating: 5
    });

    try {
      // Fetch packages for this agency (using agency.userId._id)
      const providerId = agency.userId._id || agency.userId;
      const [pkgsRes, reviewsRes] = await Promise.all([
        agencyAPI.getPackages(providerId),
        reviewAPI.getByProvider(providerId)
      ]);
      setPackages(pkgsRes.data.packages || []);
      setReviews(reviewsRes.data.reviews || []);

      // Fetch traveler's bookings to associate review with a booking
      if (token && user?.role === 'traveler') {
        const bookingsRes = await bookingAPI.getMyBookings();
        // Filter traveler's bookings that are package bookings and belong to this agency's packages
        const packageIds = pkgsRes.data.packages.map(p => p._id);
        const filteredBookings = (bookingsRes.data.bookings || []).filter(
          b => b.bookingType === 'package' && packageIds.includes(b.packageOrServiceId?._id || b.packageOrServiceId)
        );
        setUserBookings(filteredBookings);
        if (filteredBookings.length > 0) {
          setReviewFormData(prev => ({ ...prev, bookingId: filteredBookings[0]._id }));
        }
      }
    } catch (err) {
      console.error('Error fetching details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        bookingType: 'package',
        packageOrServiceId: bookingPackage._id,
        bookingDate: bookingFormData.bookingDate,
        totalPrice: bookingPackage.pricePerPerson * bookingFormData.numberOfPeople,
        numberOfPeople: Number(bookingFormData.numberOfPeople),
        specialRequests: bookingFormData.specialRequests,
        paymentMethod: bookingFormData.paymentMethod
      };
      
      await bookingAPI.create(payload);
      setBookingSuccess('Booking request submitted successfully!');
      setTimeout(() => {
        setBookingPackage(null);
        setBookingSuccess(null);
        // Refresh details to fetch new booking if they want to review
        handleViewDetails(selectedAgency);
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
      // Refresh reviews list
      const providerId = selectedAgency.userId._id || selectedAgency.userId;
      const reviewsRes = await reviewAPI.getByProvider(providerId);
      setReviews(reviewsRes.data.reviews || []);
      
      setTimeout(() => {
        setReviewSuccess(null);
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const r = Math.round(rating || 0);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= r ? 'text-yellow-400 text-lg' : 'text-gray-300 text-lg'}>
          ★
        </span>
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
            Explore Partner Agencies
          </h1>
          <p className="text-lg text-gray-600">
            Discover verified travel packages, read real reviews, and secure your next dream trip.
          </p>
        </div>

        {/* Filters */}
        <form onSubmit={handleFilterSubmit} className="bg-white p-6 rounded-xl shadow-md mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Country</label>
            <input
              type="text"
              name="country"
              value={filters.country}
              onChange={handleFilterChange}
              placeholder="e.g. United States"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">City</label>
            <input
              type="text"
              name="city"
              value={filters.city}
              onChange={handleFilterChange}
              placeholder="e.g. Miami"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Search
            </button>
            {(filters.country || filters.city) && (
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

        {/* Agency Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading travel agencies...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        ) : agencies.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-lg">No agencies found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agencies.map((agency) => (
              <div key={agency._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300 flex flex-col h-full border border-gray-100">
                {/* Cover Image Placeholder */}
                <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500 relative">
                  {agency.logo && (
                    <img
                      src={`http://localhost:5000${agency.logo}`}
                      alt={agency.agencyName}
                      className="absolute -bottom-6 left-6 w-16 h-16 rounded-full border-4 border-white bg-white object-cover"
                    />
                  )}
                </div>
                
                <div className="p-6 pt-8 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{agency.agencyName}</h3>
                    
                    {/* Ratings */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="flex">{renderStars(agency.rating)}</div>
                      <span className="text-sm font-semibold text-gray-700">({agency.rating || 0})</span>
                      <span className="text-xs text-gray-400">• {agency.reviewCount || 0} reviews</span>
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                      {agency.description || "No description provided."}
                    </p>

                    <div className="space-y-1 mb-6">
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        📍 {agency.location?.city ? `${agency.location.city}, ${agency.location.country}` : 'Global'}
                      </div>
                      <div className="text-xs text-gray-500">
                        📞 {agency.phone}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewDetails(agency)}
                    className="w-full py-2.5 border border-black rounded-lg text-sm font-semibold hover:bg-black hover:text-white transition duration-200"
                  >
                    View Packages & Reviews
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Agency Detail Modal */}
        {selectedAgency && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedAgency(null)}
                className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full w-8 h-8 flex items-center justify-center font-bold transition"
              >
                ✕
              </button>

              <div className="p-6 md:p-8">
                {/* Agency Header Details */}
                <div className="flex items-start gap-4 mb-6">
                  {selectedAgency.logo && (
                    <img
                      src={`http://localhost:5000${selectedAgency.logo}`}
                      alt={selectedAgency.agencyName}
                      className="w-16 h-16 rounded-full object-cover border border-gray-200"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">{selectedAgency.agencyName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-gray-700">Average Rating: {selectedAgency.rating || 0}/5</span>
                      <span className="text-yellow-400">★</span>
                      <span className="text-xs text-gray-400">({selectedAgency.reviewCount || 0} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-100 pb-6 mb-6">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">About Us</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{selectedAgency.description}</p>
                </div>

                {loadingDetails ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                    <p className="text-xs text-gray-400 mt-2">Loading details...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Packages Section */}
                    <div className="lg:col-span-2 space-y-6">
                      <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2">
                        Travel Packages ({packages.length})
                      </h3>
                      
                      {packages.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No active travel packages currently listed.</p>
                      ) : (
                        <div className="space-y-4">
                          {packages.map((pkg) => (
                            <div key={pkg._id} className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div>
                                <h4 className="font-bold text-gray-900 text-base">{pkg.packageName}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">{pkg.duration_days} Days / {pkg.duration_nights} Nights • {pkg.destination_city}, {pkg.destination_country}</p>
                                <p className="text-sm text-gray-600 line-clamp-2 mt-2">{pkg.description}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {pkg.included.map((inc, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded">
                                      {inc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-left md:text-right shrink-0">
                                <div className="text-lg font-extrabold text-black">${pkg.pricePerPerson}</div>
                                <div className="text-[10px] text-gray-400 uppercase">Per Person</div>
                                {token && user?.role === 'traveler' ? (
                                  <button
                                    onClick={() => setBookingPackage(pkg)}
                                    className="mt-2 px-4 py-1.5 bg-black text-white text-xs font-semibold rounded hover:bg-gray-800 transition"
                                  >
                                    Book Now
                                  </button>
                                ) : (
                                  <p className="text-[10px] text-gray-400 mt-2 italic">Login as traveler to book</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reviews Section */}
                      <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2 pt-4">
                        Reviews ({reviews.length})
                      </h3>
                      
                      {reviews.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No reviews submitted yet. Be the first to review!</p>
                      ) : (
                        <div className="space-y-4">
                          {reviews.map((rev) => (
                            <div key={rev._id} className="p-4 border border-gray-100 rounded-xl">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold text-xs uppercase text-gray-600">
                                    {rev.reviewerId?.name?.substring(0, 2) || 'TR'}
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-sm text-gray-900">{rev.reviewerId?.name}</h5>
                                    <div className="flex gap-0.5">{renderStars(rev.rating)}</div>
                                  </div>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {new Date(rev.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {rev.title && <h6 className="font-semibold text-gray-900 mt-2 text-sm">"{rev.title}"</h6>}
                              <p className="text-gray-600 text-xs mt-1 leading-relaxed">{rev.comment}</p>
                              
                              {/* Subratings display */}
                              <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-gray-50 text-[10px] text-gray-500">
                                <div>🧹 Cleanliness: {rev.cleanliness_rating}/5</div>
                                <div>🛋️ Comfort: {rev.comfort_rating}/5</div>
                                <div>💼 Professionalism: {rev.professionalism_rating}/5</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Book Form or Review Form Panel */}
                    <div className="space-y-6">
                      
                      {/* Booking Form Interface */}
                      {bookingPackage ? (
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                          <h4 className="font-bold text-gray-900 text-base mb-3">Book: {bookingPackage.packageName}</h4>
                          
                          {bookingSuccess ? (
                            <div className="p-3 bg-green-100 text-green-800 rounded border border-green-200 text-xs text-center font-semibold">
                              {bookingSuccess}
                            </div>
                          ) : (
                            <form onSubmit={handleBookSubmit} className="space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Date of Travel</label>
                                <input
                                  type="date"
                                  className="w-full p-2 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                  value={bookingFormData.bookingDate}
                                  onChange={(e) => setBookingFormData(prev => ({ ...prev, bookingDate: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Number of People</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={bookingPackage.maxGroupSize}
                                  className="w-full p-2 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                  value={bookingFormData.numberOfPeople}
                                  onChange={(e) => setBookingFormData(prev => ({ ...prev, numberOfPeople: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Payment Method</label>
                                <select
                                  className="w-full p-2 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                  value={bookingFormData.paymentMethod}
                                  onChange={(e) => setBookingFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                >
                                  <option value="Card">Credit/Debit Card</option>
                                  <option value="Cash">Cash on Delivery</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Special Requests</label>
                                <textarea
                                  placeholder="e.g. Vegetarian food, late check-in..."
                                  rows="2"
                                  className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-black"
                                  value={bookingFormData.specialRequests}
                                  onChange={(e) => setBookingFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                                />
                              </div>
                              
                              <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-sm font-bold text-black">
                                <span>Total Price:</span>
                                <span>${bookingPackage.pricePerPerson * bookingFormData.numberOfPeople}</span>
                              </div>

                              <div className="flex gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setBookingPackage(null)}
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
                        </div>
                      ) : null}

                      {/* Review Submission Form (Only visible to travelers with bookings) */}
                      {token && user?.role === 'traveler' && !bookingPackage && (
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                          <h4 className="font-bold text-gray-900 text-base mb-3">Leave a Review</h4>
                          
                          {userBookings.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">
                              You can only review agencies you have booked with. Book a travel package first to leave your feedback!
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
                                      onChange={(e) => setReviewFormData(prev => ({ ...prev, bookingId: e.target.value }))}
                                      required
                                    >
                                      {userBookings.map(b => (
                                        <option key={b._id} value={b._id}>
                                          {b.bookingNumber} ({b.packageOrServiceId?.packageName || 'Package'})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Overall Rating</label>
                                    <select
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                                      value={reviewFormData.rating}
                                      onChange={(e) => setReviewFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                                    >
                                      <option value="5">5 - Excellent ★★★★★</option>
                                      <option value="4">4 - Good ★★★★</option>
                                      <option value="3">3 - Average ★★★</option>
                                      <option value="2">2 - Poor ★★</option>
                                      <option value="1">1 - Terrible ★</option>
                                    </select>
                                  </div>

                                  {/* Subratings */}
                                  <div className="grid grid-cols-1 gap-2 border-t border-b border-gray-100 py-2">
                                    <div className="flex justify-between items-center text-xs">
                                      <span>🧹 Cleanliness:</span>
                                      <input
                                        type="range" min="1" max="5"
                                        value={reviewFormData.cleanliness_rating}
                                        onChange={(e) => setReviewFormData(prev => ({ ...prev, cleanliness_rating: Number(e.target.value) }))}
                                        className="w-20"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span>🛋️ Comfort:</span>
                                      <input
                                        type="range" min="1" max="5"
                                        value={reviewFormData.comfort_rating}
                                        onChange={(e) => setReviewFormData(prev => ({ ...prev, comfort_rating: Number(e.target.value) }))}
                                        className="w-20"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span>💼 Professionalism:</span>
                                      <input
                                        type="range" min="1" max="5"
                                        value={reviewFormData.professionalism_rating}
                                        onChange={(e) => setReviewFormData(prev => ({ ...prev, professionalism_rating: Number(e.target.value) }))}
                                        className="w-20"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Title</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Dream Trip!"
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                                      value={reviewFormData.title}
                                      onChange={(e) => setReviewFormData(prev => ({ ...prev, title: e.target.value }))}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Comment</label>
                                    <textarea
                                      rows="3"
                                      placeholder="Write your review comments here..."
                                      className="w-full p-2 border border-gray-200 bg-white rounded text-xs focus:outline-none"
                                      value={reviewFormData.comment}
                                      onChange={(e) => setReviewFormData(prev => ({ ...prev, comment: e.target.value }))}
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
