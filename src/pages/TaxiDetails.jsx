import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { taxiAPI, bookingAPI, reviewAPI } from '../services/api';

const VEHICLE_ICONS = {
  sedan: '🚗',
  suv: '🚙',
  minivan: '🚐',
  luxury: '🏎️',
  bus: '🚌',
};

export default function TaxiDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  
  const [taxi, setTaxi] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    fetchTaxiDetails();
  }, [id]);

  const fetchTaxiDetails = async () => {
    setLoading(true);
    try {
      // Find the taxi by ID.
      const response = await taxiAPI.getAll();
      const foundTaxi = response.data.taxiProviders.find(t => t._id === id);
      
      if (!foundTaxi) {
        setError('Taxi Provider not found.');
        return;
      }
      
      setTaxi(foundTaxi);
      setBookingFormData(prev => ({ ...prev, vehiclePreference: foundTaxi.vehicleTypes?.[0] || '' }));

      const providerId = foundTaxi.userId?._id || foundTaxi.userId;
      const reviewsRes = await reviewAPI.getByProvider(providerId);
      setReviews(reviewsRes.data.reviews || []);

      if (token && user?.role === 'traveler') {
        const bookingsRes = await bookingAPI.getMyBookings();
        const myTaxiBookings = (bookingsRes.data.bookings || []).filter(
          b => b.bookingType === 'taxi' &&
               (b.packageOrServiceId?._id || b.packageOrServiceId)?.toString() === foundTaxi._id?.toString()
        );
        setUserBookings(myTaxiBookings);
        if (myTaxiBookings.length > 0) {
          setReviewFormData(prev => ({ ...prev, bookingId: myTaxiBookings[0]._id }));
        }
      }
    } catch (err) {
      setError('Failed to fetch taxi details.');
    } finally {
      setLoading(false);
    }
  };

  const computeTotalPrice = () => {
    const dist = parseFloat(bookingFormData.tripDistance) || 0;
    const base = taxi?.basePrice || 0;
    const perKm = taxi?.pricePerKm || 0;
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
        packageOrServiceId: taxi._id,
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
        fetchTaxiDetails();
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
        fetchTaxiDetails();
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

  if (error || !taxi) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg text-center shadow-sm max-w-md w-full">
          <p className="text-lg font-bold mb-2">Oops!</p>
          <p>{error}</p>
          <button onClick={() => navigate('/browse-taxis')} className="mt-4 px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800">
            Back to Taxis
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
          <span onClick={() => navigate('/browse-taxis')} className="cursor-pointer hover:text-black hover:underline">Taxis</span>
          {' > '}
          <span className="text-gray-900 font-bold">{taxi.businessName}</span>
        </div>

        {/* Taxi Header Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-6 items-start">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-md">
            🚖
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">{taxi.businessName}</h1>
              <div className="mt-2 md:mt-0 text-right">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Base Fare</div>
                <div className="text-3xl font-extrabold text-black">${taxi.basePrice}</div>
                <div className="text-sm text-gray-600 font-medium">+ ${taxi.pricePerKm} / km</div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                {renderStars(taxi.rating)}
                <span className="font-bold text-gray-800 ml-1">{(taxi.rating || 0).toFixed(1)}/5</span>
                <span>({taxi.reviewCount || 0} reviews)</span>
              </div>
              {taxi.isVerified && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold text-xs uppercase tracking-wider">
                  Verified
                </span>
              )}
            </div>
            <p className="text-gray-700 leading-relaxed max-w-3xl">
              {taxi.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            
            <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Service Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Coverage Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {taxi.serviceArea?.map(a => (
                      <span key={a} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded border border-gray-200">{a}</span>
                    ))}
                  </div>
                </div>
                <div>
                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Available Vehicles</h3>
                   <div className="flex flex-wrap gap-2">
                    {taxi.vehicleTypes?.map(v => (
                      <span key={v} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded border border-gray-200 flex items-center gap-1">
                        {VEHICLE_ICONS[v] || '🚗'} <span className="capitalize">{v}</span>
                      </span>
                    ))}
                   </div>
                </div>
              </div>

              {taxi.vehicles?.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Our Fleet</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {taxi.vehicles.map((v, idx) => (
                      <div key={idx} className="flex gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50 items-center">
                        <div className="text-4xl">{VEHICLE_ICONS[v.type] || '🚘'}</div>
                        <div>
                          <div className="font-bold text-gray-900">{v.model}</div>
                          <div className="text-xs text-gray-500 mb-1">{v.registrationNumber}</div>
                          <div className="text-xs font-medium text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200 inline-block capitalize">
                            {v.type} • {v.capacity} Seats
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">
                Customer Reviews
              </h2>
              
              {reviews.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No reviews yet for this provider.</p>
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
            
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-sm border-b border-gray-100 pb-2">Contact Info</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="font-semibold text-gray-900 w-20 shrink-0">Phone:</span> 
                  <span>{taxi.phone || 'N/A'}</span>
                </li>
                {taxi.email && (
                  <li className="flex gap-2">
                    <span className="font-semibold text-gray-900 w-20 shrink-0">Email:</span> 
                    <span className="break-all">{taxi.email}</span>
                  </li>
                )}
                <li className="flex gap-2">
                  <span className="font-semibold text-gray-900 w-20 shrink-0">Location:</span> 
                  <span>{taxi.location?.city}, {taxi.location?.country}</span>
                </li>
              </ul>
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
                    Book Taxi
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
                    {bookingError && (
                      <div className="p-3 bg-red-50 text-red-700 rounded text-sm text-center font-semibold border border-red-200">
                        {bookingError}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={bookingFormData.bookingDate}
                        onChange={e => setBookingFormData(prev => ({ ...prev, bookingDate: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Pickup</label>
                        <input
                          type="text"
                          required
                          placeholder="Location"
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          value={bookingFormData.pickupLocation}
                          onChange={e => setBookingFormData(prev => ({ ...prev, pickupLocation: e.target.value }))}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Drop-off</label>
                        <input
                          type="text"
                          required
                          placeholder="Location"
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          value={bookingFormData.dropoffLocation}
                          onChange={e => setBookingFormData(prev => ({ ...prev, dropoffLocation: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Dist (km)</label>
                        <input
                          type="number"
                          min="1"
                          step="0.1"
                          required
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          value={bookingFormData.tripDistance}
                          onChange={e => setBookingFormData(prev => ({ ...prev, tripDistance: e.target.value }))}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Passengers</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          required
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          value={bookingFormData.numberOfPeople}
                          onChange={e => setBookingFormData(prev => ({ ...prev, numberOfPeople: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Vehicle Pref</label>
                      <select
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={bookingFormData.vehiclePreference}
                        onChange={e => setBookingFormData(prev => ({ ...prev, vehiclePreference: e.target.value }))}
                      >
                         <option value="">No preference</option>
                         {(taxi.vehicleTypes || []).map(vt => (
                           <option key={vt} value={vt}>{VEHICLE_ICONS[vt] || '🚗'} {vt.charAt(0).toUpperCase() + vt.slice(1)}</option>
                         ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Payment Method</label>
                      <select
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={bookingFormData.paymentMethod}
                        onChange={e => setBookingFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      >
                        <option value="Cash">Cash to Driver</option>
                        <option value="Card">Card / Online</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Notes</label>
                      <textarea
                        rows="2"
                        placeholder="Luggage details, etc."
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={bookingFormData.specialRequests}
                        onChange={e => setBookingFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                      />
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                       <div className="flex justify-between text-sm text-gray-600">
                         <span>Base Fare:</span>
                         <span>${taxi.basePrice}</span>
                       </div>
                       <div className="flex justify-between text-sm text-gray-600 border-b border-gray-200 pb-2">
                         <span>Distance Fare:</span>
                         <span>${(parseFloat(bookingFormData.tripDistance || 0) * taxi.pricePerKm).toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between items-center pt-1">
                         <span className="text-sm font-bold text-gray-900">Total Estimate:</span>
                         <span className="text-2xl font-extrabold text-black">
                           ${computeTotalPrice().toFixed(2)}
                         </span>
                       </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition shadow-lg hover:shadow-xl"
                    >
                      Request Taxi
                    </button>
                  </form>
                ) : (
                  // Review Form
                  <div>
                    {userBookings.length === 0 ? (
                      <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg border border-gray-100">
                        You can only review taxi providers you have ridden with.
                      </p>
                    ) : (
                      <form onSubmit={handleReviewSubmit} className="space-y-4">
                        {reviewSuccess && (
                          <div className="p-3 bg-green-50 text-green-700 rounded text-sm text-center font-semibold border border-green-200">
                            {reviewSuccess}
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Select Ride</label>
                          <select
                            required
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            value={reviewFormData.bookingId}
                            onChange={e => setReviewFormData(prev => ({ ...prev, bookingId: e.target.value }))}
                          >
                            {userBookings.map(b => (
                              <option key={b._id} value={b._id}>
                                {b.bookingNumber} - {new Date(b.bookingDate).toLocaleDateString()}
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
                            <span className="font-medium text-gray-600">🧹 Clean:</span>
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
                            placeholder="e.g. Smooth ride!"
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
                <p className="text-gray-900 font-bold mb-2">Want to book this ride?</p>
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
