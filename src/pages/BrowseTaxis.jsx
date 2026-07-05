import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { taxiAPI } from '../services/api';

const VEHICLE_ICONS = {
  sedan: '🚗',
  suv: '🚙',
  minivan: '🚐',
  luxury: '🏎️',
  bus: '🚌',
};

export default function BrowseTaxis() {
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  const [taxis, setTaxis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search Filters
  const [filters, setFilters] = useState({ country: '', city: '', vehicleType: '' });

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

  const handleViewDetails = (taxi) => {
    navigate(`/taxi/${taxi._id}`);
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
            Find Your Ride
          </h1>
          <p className="text-lg text-gray-600">
            Reliable local drivers, clear pricing, and comfortable vehicles for any journey.
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
              placeholder="e.g. United Kingdom"
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
              placeholder="e.g. London"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Vehicle Type</label>
            <select
              name="vehicleType"
              value={filters.vehicleType}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Any</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="minivan">Minivan</option>
              <option value="luxury">Luxury</option>
              <option value="bus">Bus</option>
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
            <p className="text-gray-500 mt-4">Loading taxi services...</p>
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
                <div className="p-6 flex-1 flex flex-col">
                  
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{taxi.businessName}</h3>
                      <div className="flex items-center gap-1.5">
                        <div className="flex">{renderStars(taxi.rating)}</div>
                        <span className="text-xs text-gray-400">({taxi.reviewCount || 0})</span>
                      </div>
                    </div>
                    {/* Badge */}
                    <div className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                      Verified
                    </div>
                  </div>

                  {/* Pricing block */}
                  <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center mb-4 border border-gray-100">
                    <div>
                      <span className="text-sm font-semibold text-gray-500 block">Base Fare</span>
                      <span className="text-lg font-extrabold text-black">${taxi.basePrice}</span>
                    </div>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-500 block">Per Km</span>
                      <span className="text-lg font-extrabold text-black">${taxi.pricePerKm}</span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                    {taxi.description || "Local taxi provider available for instant booking."}
                  </p>

                  <div className="space-y-1 mb-6 flex-1">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="w-4">📍</span> {taxi.location?.city ? `${taxi.location.city}, ${taxi.location.country}` : 'Global'}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="w-4">🗺️</span> Areas: {taxi.serviceArea?.length > 0 ? taxi.serviceArea.slice(0,2).join(', ') + (taxi.serviceArea.length > 2 ? '...' : '') : 'Anywhere'}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="w-4">🚘</span> Types: {taxi.vehicleTypes?.map(v => VEHICLE_ICONS[v] || v).join(' ')}
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewDetails(taxi)}
                    className="w-full py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition duration-200"
                  >
                    View Details & Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}


      </div>
    </div>
  );
}
