import { paymentAPI } from './api';

/**
 * Loads the Razorpay checkout.js SDK from CDN.
 * Returns a promise that resolves when the script is ready.
 */
const loadRazorpaySDK = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });

/**
 * Full payment flow:
 *  1. Ensure Razorpay SDK is loaded
 *  2. Create a Razorpay order on the backend
 *  3. Open the Razorpay checkout modal
 *  4. On success, verify & save the payment on the backend
 *
 * @param {object} booking - The booking object from MyBookings
 * @param {object} user    - The logged-in user from Redux
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const processPayment = (booking, user) =>
  new Promise(async (resolve, reject) => {
    try {
      // Step 1 — load SDK
      await loadRazorpaySDK();

      // Step 2 — create order (axios call in api.js)
      let orderData;
      try {
        const res = await paymentAPI.createOrder(booking.totalPrice);
        orderData = res.data;
      } catch (axiosErr) {
        // Pull the real server error message out of the axios error
        const serverMsg = axiosErr?.response?.data?.message || axiosErr.message;
        return reject(new Error(serverMsg));
      }

      if (!orderData.success) {
        return reject(new Error(orderData.message || 'Failed to create payment order'));
      }

      // Step 3 — open Razorpay modal
      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'TravelMate',
        description: `Payment for Booking ${booking.bookingNumber}`,
        order_id: orderData.order.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#000000' },

        // Step 4 — verify on success
        handler: async (razorpayResponse) => {
          try {
            const { data: verifyData } = await paymentAPI.verifyPayment(
              razorpayResponse,
              booking._id,
              booking.totalPrice,
              user?.name,
              user?.phone
            );

            if (verifyData.success) {
              resolve({ success: true, message: 'Payment successful!' });
            } else {
              reject(new Error('Payment verification failed'));
            }
          } catch (err) {
            reject(err);
          }
        },

        modal: {
          ondismiss: () => reject(new Error('Payment cancelled by user')),
        },
      });

      // Catch payment failures from Razorpay modal (e.g. wrong key, card declined)
      rzp.on('payment.failed', (response) => {
        const reason = response?.error?.description || response?.error?.reason || 'Payment failed';
        reject(new Error(reason));
      });

      rzp.open();
    } catch (err) {
      reject(err);
    }
  });

