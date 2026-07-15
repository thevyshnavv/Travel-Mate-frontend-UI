import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { agencyAPI, bookingAPI, reviewAPI } from '../services/api';

export default function PackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  
  const [pkg, setPkg] = useState(null);
  const [agency, setAgency] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking Form State
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({
    bookingDate: '',
    numberOfPeople: 1,
    specialRequests: '',
    paymentMethod: 'Card'
  });
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Review Form State
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
    fetchPackageDetails();
  }, [id]);

  const fetchPackageDetails = async () => {
    setLoading(true);
    try {
      // Find package by searching through agencies
      // (Optimally this would be a direct getPackageById endpoint, but we work with what we have if it doesn't exist)
      const response = await agencyAPI.getPackageById(id);
      const foundPkg = response.data.package;
      const foundAgency = response.data.agency;

      if (!foundPkg) {
        setError('Package not found.');
        setLoading(false);
        return;
      }

      setPkg(foundPkg);
      setAgency(foundAgency);

      // Fetch Reviews for this provider
      const providerId = foundAgency.userId._id || foundAgency.userId;
      const reviewsRes = await reviewAPI.getByProvider(providerId);
      setReviews(reviewsRes.data.reviews || []);

      // Fetch Bookings to see if user can review
      if (token && user?.role === 'traveler') {
        try {
          const bookingsRes = await bookingAPI.getMyBookings();
          const filteredBookings = (bookingsRes.data.bookings || []).filter(
            b => b.bookingType === 'package' && (b.packageOrServiceId?._id === foundPkg._id || b.packageOrServiceId === foundPkg._id)
          );
          setUserBookings(filteredBookings);
          if (filteredBookings.length > 0) {
            setReviewFormData(prev => ({ ...prev, bookingId: filteredBookings[0]._id }));
          }
        } catch (bookingErr) {
          console.warn('Failed to fetch traveler bookings:', bookingErr.message);
        }
      }

    } catch (err) {
      console.error('FETCH PACKAGE DETAILS ERROR:', err.message, err.config?.url, err.response?.data);
      setError('Failed to load package details.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        bookingType: 'package',
        packageOrServiceId: pkg._id,
        bookingDate: bookingFormData.bookingDate,
        totalPrice: pkg.pricePerPerson * bookingFormData.numberOfPeople,
        numberOfPeople: Number(bookingFormData.numberOfPeople),
        specialRequests: bookingFormData.specialRequests,
        paymentMethod: bookingFormData.paymentMethod
      };
      
      await bookingAPI.create(payload);
      setBookingSuccess('Booking request submitted successfully!');
      setTimeout(() => {
        setShowBookingForm(false);
        setBookingSuccess(null);
        fetchPackageDetails(); // refresh
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
      setTimeout(() => {
        setReviewSuccess(null);
        fetchPackageDetails(); // refresh reviews
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg text-center shadow-sm max-w-md w-full">
          <p className="text-lg font-bold mb-2">Oops!</p>
          <p>{error}</p>
          <button onClick={() => navigate('/browse-agencies')} className="mt-4 px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800">
            Back to Agencies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-6">
          <span onClick={() => navigate('/browse-agencies')} className="cursor-pointer hover:text-black hover:underline">Agencies</span>
          {' > '}
          <span onClick={() => navigate(`/agency/${agency._id}`)} className="cursor-pointer hover:text-black hover:underline">{agency.agencyName}</span>
          {' > '}
          <span className="text-gray-900 font-bold">{pkg.packageName}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Header / Images */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="h-64 sm:h-80 bg-gray-200 relative">
                {pkg.images && pkg.images.length > 0 ? (
                  <img src={`http://localhost:5000${pkg.images[0]}`} alt={pkg.packageName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">No Image Available</div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-900 uppercase shadow-sm">
                  {pkg.duration_days}D / {pkg.duration_nights}N
                </div>
              </div>
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{pkg.packageName}</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>📍 {pkg.destination_city}, {pkg.destination_country}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wide">Price</div>
                    <div className="text-3xl font-extrabold text-black">${pkg.pricePerPerson}</div>
                  </div>
                </div>
                
                <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm mb-2 mt-6 border-b border-gray-100 pb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed text-sm">
                  {pkg.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div>
                    <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm mb-3 border-b border-gray-100 pb-2">Included</h3>
                    <ul className="space-y-2">
                      {pkg.included?.map((inc, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-green-500">✓</span> {inc}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm mb-3 border-b border-gray-100 pb-2">Not Included</h3>
                    <ul className="space-y-2">
                      {pkg.notIncluded?.map((inc, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-red-500">✕</span> {inc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm mb-3 border-b border-gray-100 pb-2">Itinerary</h3>
                  {pkg.itinerary?.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No itinerary details provided.</p>
                  ) : (
                    <div className="space-y-4">
                      {pkg.itinerary?.map((day) => (
                        <div key={day.dayNumber} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <h4 className="font-bold text-gray-900 text-sm mb-1">Day {day.dayNumber}: {day.title}</h4>
                          <p className="text-sm text-gray-600 leading-relaxed">{day.activities}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Reviews Section */}
            <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">
                Agency Reviews
              </h2>
              
              {reviews.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No reviews yet for this agency.</p>
              ) : (
                <div className="space-y-6">
                  {reviews.map(rev => (
                    <div key={rev._id} className="border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 uppercase">
                            {rev.reviewerId?.name?.substring(0, 2) || 'TR'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{rev.reviewerId?.name || 'Traveler'}</div>
                            <div className="flex gap-0.5 mt-0.5">{renderStars(rev.rating)}</div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {rev.title && <h4 className="font-bold text-gray-900 text-sm mb-1 mt-3">"{rev.title}"</h4>}
                      <p className="text-gray-700 text-sm leading-relaxed">{rev.comment}</p>
                      
                      <div className="flex gap-4 mt-4 text-xs font-medium text-gray-500">
                        <span>🧹 Clean: {rev.cleanliness_rating}/5</span>
                        <span>💺 Comfort: {rev.comfort_rating}/5</span>
                        <span>💼 Pro: {rev.professionalism_rating}/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar / Forms */}
          <div className="space-y-6">
            
            {/* Agency Summary */}
            <div className="bg-white rounded-2xl shadow-md p-6 text-center">
               {agency.logo ? (
                <img src={`http://localhost:5000${agency.logo}`} alt="logo" className="w-20 h-20 mx-auto rounded-full object-cover mb-4 border border-gray-100" />
               ) : (
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold mb-4">
                  {agency.agencyName.substring(0,2).toUpperCase()}
                </div>
               )}
               <h3 className="font-bold text-gray-900 text-lg">{agency.agencyName}</h3>
               <div className="flex items-center justify-center gap-1 text-sm mt-1 mb-3">
                 {renderStars(agency.rating)} 
                 <span className="text-gray-500 ml-1">({agency.reviewCount})</span>
               </div>
               <button 
                 onClick={() => navigate(`/agency/${agency._id}`)}
                 className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide"
               >
                 View Full Profile
               </button>
            </div>

            {token && user?.role === 'traveler' ? (
              <div className="bg-white rounded-2xl shadow-md p-6 sticky top-6">
                
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    className={`flex-1 py-2 text-xs font-bold uppercase transition ${!showBookingForm ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => setShowBookingForm(false)}
                  >
                    Review
                  </button>
                  <button
                    className={`flex-1 py-2 text-xs font-bold uppercase transition ${showBookingForm ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => setShowBookingForm(true)}
                  >
                    Book Now
                  </button>
                </div>

                {showBookingForm ? (
                  // Booking Form
                  <form onSubmit={handleBookSubmit} className="space-y-4">
                    {bookingSuccess && (
                      <div className="p-3 bg-green-50 text-green-700 rounded text-sm text-center font-semibold border border-green-200">
                        {bookingSuccess}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Date of Travel</label>
                      <input
                        type="date"
                        required
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={bookingFormData.bookingDate}
                        onChange={e => setBookingFormData(prev => ({ ...prev, bookingDate: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Travelers</label>
                      <input
                        type="number"
                        min="1"
                        max={pkg.maxGroupSize || 50}
                        required
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={bookingFormData.numberOfPeople}
                        onChange={e => setBookingFormData(prev => ({ ...prev, numberOfPeople: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Payment Method</label>
                      <select
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={bookingFormData.paymentMethod}
                        onChange={e => setBookingFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      >
                        <option value="Card">Card / Online</option>
                        <option value="Cash">Cash / Transfer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Special Requests</label>
                      <textarea
                        rows="2"
                        placeholder="Dietary needs, etc."
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={bookingFormData.specialRequests}
                        onChange={e => setBookingFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                      />
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-600">Total Price:</span>
                      <span className="text-2xl font-extrabold text-black">
                        ${pkg.pricePerPerson * (bookingFormData.numberOfPeople || 1)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition shadow-lg hover:shadow-xl"
                    >
                      Confirm Booking
                    </button>
                  </form>
                ) : (
                  // Review Form
                  <div>
                    {userBookings.length === 0 ? (
                      <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg border border-gray-100">
                        You can only review packages you have booked. Book this package first!
                      </p>
                    ) : (
                      <form onSubmit={handleReviewSubmit} className="space-y-4">
                        {reviewSuccess && (
                          <div className="p-3 bg-green-50 text-green-700 rounded text-sm text-center font-semibold border border-green-200">
                            {reviewSuccess}
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Select Booking</label>
                          <select
                            required
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            value={reviewFormData.bookingId}
                            onChange={e => setReviewFormData(prev => ({ ...prev, bookingId: e.target.value }))}
                          >
                            {userBookings.map(b => (
                              <option key={b._id} value={b._id}>
                                {b.bookingNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Overall Rating</label>
                          <select
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
                        
                        <div className="grid grid-cols-1 gap-3 py-2 border-y border-gray-100 my-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-600">🧹 Cleanliness:</span>
                            <input type="range" min="1" max="5" className="w-24 accent-black"
                              value={reviewFormData.cleanliness_rating} onChange={e => setReviewFormData(prev => ({ ...prev, cleanliness_rating: Number(e.target.value) }))}
                            />
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-600">💺 Comfort:</span>
                            <input type="range" min="1" max="5" className="w-24 accent-black"
                              value={reviewFormData.comfort_rating} onChange={e => setReviewFormData(prev => ({ ...prev, comfort_rating: Number(e.target.value) }))}
                            />
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-600">💼 Pro:</span>
                            <input type="range" min="1" max="5" className="w-24 accent-black"
                              value={reviewFormData.professionalism_rating} onChange={e => setReviewFormData(prev => ({ ...prev, professionalism_rating: Number(e.target.value) }))}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Amazing trip!"
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            value={reviewFormData.title}
                            onChange={e => setReviewFormData(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Review</label>
                          <textarea
                            rows="3"
                            required
                            placeholder="Share your experience..."
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            value={reviewFormData.comment}
                            onChange={e => setReviewFormData(prev => ({ ...prev, comment: e.target.value }))}
                          />
                        </div>
                        
                        <button
                          type="submit"
                          className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition shadow-lg hover:shadow-xl"
                        >
                          Submit Review
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 rounded-2xl p-6 text-center border border-gray-200">
                <p className="text-gray-900 font-bold mb-2">Want to book this package?</p>
                <p className="text-sm text-gray-600 mb-4">Please log in as a traveler to secure your booking.</p>
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
