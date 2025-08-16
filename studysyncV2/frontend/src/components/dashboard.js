import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { LogOut, Users, FileText, Clock, MessageSquare, Vote } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userResponse.data);
      } catch (userErr) {
        console.error('User fetch error:', userErr.response?.data?.error || userErr.message);
        setError(`Failed to load profile: ${userErr.response?.data?.error || userErr.message}`);
        if (userErr.response?.status === 401 || userErr.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
      }

      try {
        const matchesResponse = await axios.get(`${process.env.REACT_APP_API_URL}/match`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMatches(matchesResponse.data.matches);
      } catch (matchesErr) {
        console.error('Matches fetch error:', matchesErr.response?.data?.error || matchesErr.message);
        setError((prev) => prev || `Failed to load matches: ${matchesErr.response?.data?.error || matchesErr.message}`);
        if (matchesErr.response?.status === 401 || matchesErr.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
      }

      try {
        const progressResponse = await axios.get(`${process.env.REACT_APP_API_URL}/progress`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProgress(progressResponse.data.progress);
      } catch (progressErr) {
        console.error('Progress fetch error:', progressErr.response?.data?.error || progressErr.message);
        setError((prev) => prev || `Failed to load progress: ${progressErr.response?.data?.error || progressErr.message}`);
        if (progressErr.response?.status === 401 || progressErr.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Chart data for progress
  const chartData = {
    labels: progress.map(p => p.room_id),
    datasets: [
      {
        label: 'Hours Spent',
        data: progress.map(p => p.hours_spent),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Messages Sent',
        data: progress.map(p => p.messages_sent),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
      {
        label: 'Notes Shared',
        data: progress.map(p => p.notes_shared),
        backgroundColor: 'rgba(245, 158, 11, 0.5)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Study Session Progress' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 p-6 font-sans">
      {error && (
        <p className="text-red-500 p-4 bg-red-100 border-b border-red-200 animate-pulse">{error}</p>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">StudySync Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            <LogOut className="w-5 h-5 mr-2" /> Logout
          </button>
        </div>

        {/* User Profile */}
        {user ? (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-2xl font-bold mb-4 text-primary flex items-center">
              <span className="mr-2">👤</span> Profile
            </h2>
            <p className="text-gray-700">Email: <strong>{user.email}</strong></p>
            <p className="text-gray-700">Field of Study: <strong>{user.field_of_study || 'Not set'}</strong></p>
            <p className="text-gray-700">Academic Level: <strong>{user.academic_level || 'Not set'}</strong></p>
            <p className="text-gray-700">Learning Style: <strong>{user.learning_style || 'Not set'}</strong></p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-2xl font-bold mb-4 text-primary flex items-center">
              <span className="mr-2">👤</span> Profile
            </h2>
            <p className="text-gray-500 italic">Loading profile data...</p>
          </div>
        )}

        {/* Matches */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-4 text-primary flex items-center">
            <Users className="w-6 h-6 mr-2" /> AI Matches
          </h2>
          {matches.length > 0 ? (
            <ul className="space-y-4">
              {matches.map((match, index) => (
                <li key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <p className="text-gray-700">User: <strong>{match.email}</strong></p>
                  <p className="text-gray-700">Field: <strong>{match.field_of_study}</strong></p>
                  <p className="text-gray-700">Compatibility: <strong>{(match.compatibility * 100).toFixed(1)}%</strong></p>
                  <Link
                    to={`/room/${match.roomId}`}
                    className="inline-block mt-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Join Study Room
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No matches found. Try again later!</p>
          )}
        </div>

        {/* Progress */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-primary flex items-center">
            <Clock className="w-6 h-6 mr-2" /> Study Progress
          </h2>
          {progress.length > 0 ? (
            <div>
              <div className="mb-6">
                <Bar data={chartData} options={chartOptions} />
              </div>
              <ul className="space-y-4">
                {progress.map((session, index) => (
                  <li key={index} className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 flex items-center">
                      <span className="mr-2">🏠</span> Room: <strong>{session.room_id}</strong>
                    </p>
                    <p className="text-gray-700 flex items-center">
                      <Clock className="w-5 h-5 mr-2" /> Hours Spent: <strong>{session.hours_spent}</strong>
                    </p>
                    <p className="text-gray-700 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2" /> Messages Sent: <strong>{session.messages_sent}</strong>
                    </p>
                    <p className="text-gray-700 flex items-center">
                      <FileText className="w-5 h-5 mr-2" /> Notes Shared: <strong>{session.notes_shared}</strong>
                    </p>
                    <p className="text-gray-700 flex items-center">
                      <Upload className="w-5 h-5 mr-2" /> Files Uploaded: <strong>{session.files_uploaded}</strong>
                    </p>
                    <p className="text-gray-700 flex items-center">
                      <Vote className="w-5 h-5 mr-2" /> Poll Votes: <strong>{session.poll_votes}</strong>
                    </p>
                    <p className="text-gray-600 text-sm">Last Updated: {new Date(session.last_updated).toLocaleString()}</p>
                    {session.badge && (
                      <p className="text-gray-700 flex items-center">
                        <span className="mr-2">🏆</span> Badge: <strong>{session.badge}</strong>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-500 italic">Join a study room to start tracking your progress!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;