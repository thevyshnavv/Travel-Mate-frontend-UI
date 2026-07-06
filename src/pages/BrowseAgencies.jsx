import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { agencyAPI } from '../services/api';

export default function BrowseAgencies() {
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState([]);
  const [packages, setPackages] = useState([]);
  const [viewMode, setViewMode] = useState('agencies'); // 'agencies' | 'packages'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search Filters
  const [placeFilter, setPlaceFilter] = useState('');

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const response = await agencyAPI.getAll({});
      setAgencies(response.data.agencies || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch travel agencies.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async (place) => {
    setLoading(true);
    try {
      const response = await agencyAPI.getAllPackages({ place });
      setPackages(response.data.packages || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch packages for this location.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setPlaceFilter(e.target.value);
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    if (placeFilter.trim() === '') {
      setViewMode('agencies');
      fetchAgencies();
    } else {
      setViewMode('packages');
      fetchPackages(placeFilter);
    }
  };

  const handleClearFilters = () => {
    setPlaceFilter('');
    setViewMode('agencies');
    fetchAgencies();
  };

  const handleViewPackage = (pkg) => {
    navigate(`/package/${pkg._id}`);
  };

  const handleViewDetails = (agency) => {
    navigate(`/agency/${agency._id}`);
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
          <div className="flex-1 min-w-[300px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Search Destination Place (City / Country)</label>
            <input
              type="text"
              name="place"
              value={placeFilter}
              onChange={handleFilterChange}
              placeholder="e.g. Paris, Tokyo, United States"
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
            {placeFilter && (
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

        {/* Results Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        ) : (viewMode === 'agencies' && agencies.length === 0) || (viewMode === 'packages' && packages.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-lg">No results found matching your search.</p>
          </div>
        ) : viewMode === 'agencies' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agencies.map((agency) => (
              <div key={agency._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300 flex flex-col h-full border border-gray-100">
                {/* Cover Image Placeholder */}
                <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500 relative overflow-hidden">
                  {agency.coverImage && (
                    <img 
                      src={`http://localhost:5000${agency.coverImage}`} 
                      alt="cover" 
                      className="w-full h-full object-cover"
                    />
                  )}
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div key={pkg._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300 flex flex-col h-full border border-gray-100">
                <div className="h-40 bg-gray-100 relative overflow-hidden">
                  {pkg.images && pkg.images.length > 0 ? (
                     <img src={`http://localhost:5000${pkg.images[0]}`} className="w-full h-full object-cover" alt="package" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-3xl">🌴</div>
                  )}
                  <span className="absolute top-4 right-4 bg-white/90 px-3 py-1 text-xs font-bold rounded shadow-sm text-black uppercase">
                     ${pkg.pricePerPerson}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{pkg.packageName}</h3>
                  <p className="text-xs text-gray-500 mb-3">By {pkg.agencyId?.agencyName || 'Travel Agency'}</p>
                  
                  <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                    <span>📍 {pkg.destination_city}, {pkg.destination_country}</span>
                    <span>• {pkg.duration_days}D/{pkg.duration_nights}N</span>
                  </div>
                  
                  <p className="text-gray-600 text-xs line-clamp-2 mb-4 flex-1">
                    {pkg.description}
                  </p>
                  
                  <button
                    onClick={() => handleViewPackage(pkg)}
                    className="w-full py-2 bg-black text-white rounded font-semibold text-xs hover:bg-gray-800 transition"
                  >
                    View Details
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
