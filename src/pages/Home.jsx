import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

export default function Home() {
  const { user, token } = useSelector((state) => state.auth);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to TravelMate
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Plan your trips, book agencies, and hire taxis all in one place
          </p>

          {token && user ? (
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-black mb-4">Hello, {user.name}! 👋</h2>
              <p className="text-gray-600 mb-6">
                You are logged in as a <span className="font-semibold">{user.role}</span>
              </p>
              <div className="space-y-3">
                {user.role === 'traveler' && (
                  <>
                    <Link
                      to="/browse-agencies"
                      className="block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                      Browse Travel Agencies
                    </Link>
                    <Link
                      to="/browse-taxis"
                      className="block px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                      Browse Taxi Services
                    </Link>
                  </>
                )}
                {user.role === 'agency' && (
                  <Link
                    to="/agency-dashboard"
                    className="block px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                  >
                    Your Agency Dashboard
                  </Link>
                )}
                {user.role === 'taxi_provider' && (
                  <Link
                    to="/taxi-dashboard"
                    className="block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                  >
                    Your Taxi Dashboard
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link
                to="/login"
                className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-semibold"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-8 py-3 bg-white text-black border-2 border-black rounded-lg hover:bg-gray-50 transition font-semibold"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why Choose TravelMate?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-xl font-bold text-black mb-2">Wide Selection</h3>
            <p className="text-gray-600">
              Choose from hundreds of travel agencies and taxi providers
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="text-xl font-bold text-black mb-2">Top Rated</h3>
            <p className="text-gray-600">
              All providers are verified and reviewed by our community
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-black mb-2">Easy Booking</h3>
            <p className="text-gray-600">
              Book your trip in just a few clicks, anytime, anywhere
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}