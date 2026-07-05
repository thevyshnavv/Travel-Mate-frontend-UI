import { useState, useEffect } from 'react';
import { bookingAPI } from '../services/api';
import { useSelector } from 'react-redux';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await bookingAPI.getMyBookings();
      setBookings(res.data.bookings || []);
    } catch (err) {
      setError('Failed to load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (booking) => {
    try {
      // 1. Create order on backend
      const orderRes = await fetch('http://localhost:5000/api/v1/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount: booking.totalPrice })
      });
      const orderData = await orderRes.json();
      
      if (!orderData.success) {
        alert('Failed to initialize payment');
        return;
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: 'rzp_test_placeholder_key', // This should preferably come from backend or env in production
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'TravelMate',
        description: `Payment for Booking ${booking.bookingNumber}`,
        order_id: orderData.order.id,
        handler: async function (response) {
          // 3. Verify on backend
          const verifyRes = await fetch('http://localhost:5000/api/v1/payment/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(response)
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            alert('Payment successful!');
            // Here you'd update booking status to 'Confirmed' via an API call
            // For now, let's just refresh bookings
            fetchBookings();
          } else {
            alert('Payment verification failed');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#000000'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert('Payment failed to initiate.');
    }
  };

  // Helper to safely load Razorpay SDK dynamically if not in index.html
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            My Bookings
          </h1>
          <p className="text-lg text-gray-600">
            View your upcoming trips, past adventures, and manage payments.
          </p>
        </div>

        {error ? (
          <div className="bg-red-50 text-red-700 p-6 rounded-xl text-center max-w-2xl mx-auto shadow-sm">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100 max-w-3xl mx-auto">
            <div className="text-5xl mb-4">🧳</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No bookings found</h2>
            <p className="text-gray-500 mb-6">You haven't booked any travel packages or taxis yet.</p>
            <a href="/browse-agencies" className="inline-block px-6 py-2.5 bg-black text-white font-bold rounded hover:bg-gray-800 transition">
              Start Exploring
            </a>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {bookings.map(b => (
              <div key={b._id} className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 flex flex-col md:flex-row gap-6 items-start md:items-center">
                
                {/* Details Section */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase tracking-wide">
                      {b.bookingType}
                    </span>
                    <span className="text-xs font-semibold text-gray-400">Ref: {b.bookingNumber}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {b.packageOrServiceId?.packageName || b.packageOrServiceId?.businessName || 'Service Provider'}
                  </h3>
                  
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <div>📅 Date: {new Date(b.bookingDate).toLocaleDateString()} at {new Date(b.bookingDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div>👥 People: {b.numberOfPeople}</div>
                    {b.specialRequests && <div className="italic text-xs mt-1 bg-gray-50 p-2 rounded">Notes: {b.specialRequests}</div>}
                  </div>
                </div>

                {/* Status & Payment Section */}
                <div className="w-full md:w-48 flex flex-col items-end shrink-0 gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                  <div className="text-right w-full flex md:flex-col justify-between items-center md:items-end">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Total</span>
                    <span className="text-2xl font-extrabold text-black">${b.totalPrice}</span>
                  </div>
                  
                  <div className="w-full">
                    <div className="flex justify-between md:justify-end items-center gap-2 mb-2 text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-bold ${
                        b.status === 'Confirmed' ? 'text-green-600' :
                        b.status === 'Pending' ? 'text-yellow-600' : 'text-red-600'
                      }`}>{b.status}</span>
                    </div>
                    
                    <div className="flex justify-between md:justify-end items-center gap-2 text-sm">
                      <span className="text-gray-500">Payment:</span>
                      <span className={`font-bold ${
                        b.paymentStatus === 'Paid' ? 'text-green-600' : 'text-orange-500'
                      }`}>{b.paymentStatus || 'Pending'}</span>
                    </div>
                  </div>

                  {b.paymentStatus !== 'Paid' && b.paymentMethod === 'Card' && (
                    <button
                      onClick={() => handlePayment(b)}
                      className="w-full mt-2 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-gray-800 transition shadow-md"
                    >
                      Pay Now
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
