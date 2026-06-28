import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginSuccess } from '../redux/authSlice';
import { userAPI } from '../services/api';

export default function Profile() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: ''
  });
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || ''
      });
      if (user.avatar) {
        setAvatarPreview(`http://localhost:5000${user.avatar}`);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('phone', formData.phone);
      data.append('bio', formData.bio);
      
      if (avatarFile) {
        data.append('avatar', avatarFile);
      }

      const response = await userAPI.updateProfile(data);
      if (response.data.success) {
        setSuccessMsg('Profile updated successfully!');
        // Update user state in redux store
        dispatch(loginSuccess({ user: response.data.user, token }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 flex justify-center items-start px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-lg w-full p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Your Profile</h1>
          <p className="text-gray-500 text-sm">Update your personal account information and photo.</p>
        </div>

        {successMsg && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm text-center font-medium mb-6">
            ✅ {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm text-center font-medium mb-6">
            ❌ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full border-2 border-black flex items-center justify-center font-bold text-xl uppercase overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.substring(0, 2) || 'TM'
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-black text-white hover:bg-gray-800 p-1.5 rounded-full cursor-pointer shadow-md text-xs">
                📷
                <input
                  type="file"
                  name="avatar"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <span className="text-xs text-gray-400">Click camera to upload new avatar image.</span>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          {/* Email (Read Only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Email Address (Non-editable)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              className="w-full px-4 py-2.5 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed focus:outline-none"
              readOnly
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="555-0199"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Bio / Description</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Write a brief bio about yourself..."
              rows="4"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white hover:bg-gray-800 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Saving Profile...' : 'Save Profile Changes'}
          </button>
        </form>

      </div>
    </div>
  );
}
