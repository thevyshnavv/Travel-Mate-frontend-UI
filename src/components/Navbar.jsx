import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../redux/authSlice';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">✈</span>
              </div>
              <span className="text-xl font-bold text-black">TravelMate</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-4 text-sm font-semibold">
            {token && user ? (
              <>
                <Link to="/profile" className="text-gray-600 hover:text-black transition">
                  👤 Profile
                </Link>
                
                {user.role === 'traveler' && (
                  <Link to="/browse-agencies" className="text-gray-600 hover:text-black transition">
                    🌍 Browse Agencies
                  </Link>
                )}
                {user.role === 'traveler' && (
                  <Link to="/browse-taxis" className="text-gray-600 hover:text-black transition">
                    🚖 Browse Taxis
                  </Link>
                )}
                {user.role === 'agency' && (
                  <Link to="/agency-dashboard" className="text-gray-600 hover:text-black transition">
                    💼 Dashboard
                  </Link>
                )}
                {user.role === 'taxi_provider' && (
                  <Link to="/taxi-dashboard" className="text-gray-600 hover:text-black transition">
                    🚕 Dashboard
                  </Link>
                )}

                <span className="text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase">
                  {user.role.replace('_', ' ')}
                </span>
                
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-700 hover:text-black transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}