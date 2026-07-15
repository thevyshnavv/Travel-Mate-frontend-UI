import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { agencyAPI, reviewAPI, bookingAPI } from '../services/api';

export default function AgencyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  
  const [agency, setAgency] = useState(null);
  const [packages, setPackages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAgencyDetails();
  }, [id]);

  const fetchAgencyDetails = async () => {
    setLoading(true);
    try {
      // Find the agency by ID.
      const response = await agencyAPI.getById(id);
      const foundAgency = response.data.agency;
      
      if (!foundAgency) {
        setError('Agency not found');
        return;
      }
      
      setAgency(foundAgency);

      const providerId = foundAgency.userId._id || foundAgency.userId;
      const [pkgsRes, reviewsRes] = await Promise.all([
        agencyAPI.getPackages(providerId),
        reviewAPI.getByProvider(providerId)
      ]);
      setPackages(pkgsRes.data.packages || []);
      setReviews(reviewsRes.data.reviews || []);
    } catch (err) {
      console.error('FETCH AGENCY DETAILS ERROR:', err);
      setError('Failed to fetch agency details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePackageClick = (pkgId) => {
    navigate(`/package/${pkgId}`);
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

  if (error || !agency) {
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
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Cover Image */}
      <div className="h-64 md:h-80 bg-gradient-to-r from-blue-400 to-indigo-600 relative overflow-hidden">
        {agency.coverImage && (
          <img 
            src={`http://localhost:5000${agency.coverImage}`} 
            alt="cover" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-6 items-start">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-md flex-shrink-0">
            {agency.logo ? (
              <img src={`http://localhost:5000${agency.logo}`} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xl">
                {agency.agencyName.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">{agency.agencyName}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                {renderStars(agency.rating)}
                <span className="font-bold text-gray-800 ml-1">{agency.rating || 0}/5</span>
                <span>({agency.reviewCount || 0} reviews)</span>
              </div>
              <div className="flex items-center gap-1">📍 {agency.location?.city ? `${agency.location.city}, ${agency.location.country}` : 'Global'}</div>
              <div className="flex items-center gap-1">📞 {agency.phone}</div>
            </div>
            <p className="text-gray-700 leading-relaxed max-w-3xl">
              {agency.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Packages Section */}
            <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">
                Available Packages
              </h2>
              
              {packages.length === 0 ? (
                <p className="text-gray-500 italic">No travel packages available right now.</p>
              ) : (
                <div className="space-y-4">
                  {packages.map(pkg => (
                    <div 
                      key={pkg._id} 
                      onClick={() => handlePackageClick(pkg._id)}
                      className="group border border-gray-100 rounded-xl p-4 hover:border-black hover:shadow-lg transition cursor-pointer flex flex-col sm:flex-row gap-4"
                    >
                      {/* Package Image Thumbnail */}
                      <div className="w-full sm:w-40 h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {pkg.images && pkg.images.length > 0 ? (
                           <img src={`http://localhost:5000${pkg.images[0]}`} alt={pkg.packageName} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs uppercase tracking-wide">No Image</div>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-black transition">{pkg.packageName}</h3>
                          <p className="text-sm text-gray-500 mb-2">{pkg.duration_days} Days / {pkg.duration_nights} Nights • {pkg.destination_city}</p>
                          <p className="text-sm text-gray-600 line-clamp-2">{pkg.description}</p>
                        </div>
                        <div className="mt-3 flex justify-between items-end">
                          <div className="flex flex-wrap gap-1">
                            {pkg.included?.slice(0, 3).map((inc, i) => (
                              <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium uppercase tracking-wider">{inc}</span>
                            ))}
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-extrabold text-black">${pkg.pricePerPerson}</div>
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Per Person</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">
                Customer Reviews
              </h2>
              
              {reviews.length === 0 ? (
                <p className="text-gray-500 italic">No reviews yet.</p>
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

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-sm border-b border-gray-100 pb-2">Contact Info</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="font-semibold text-gray-900 w-20 shrink-0">Email:</span> 
                  <span className="break-all">{agency.email || 'N/A'}</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-gray-900 w-20 shrink-0">Phone:</span> 
                  <span>{agency.phone || 'N/A'}</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-gray-900 w-20 shrink-0">Location:</span> 
                  <span>{agency.location?.city}, {agency.location?.country}</span>
                </li>
              </ul>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
