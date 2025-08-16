import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const Stats = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const isolationChartRef = useRef(null);
  const aiInterestChartRef = useRef(null);
  const wtpChartRef = useRef(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setStats(response.data);
      } catch (err) {
        setError(`Failed to load stats: ${err.response?.data?.error || err.message}`);
      }
    };
    fetchStats();

    // Cleanup charts on unmount
    return () => {
      if (isolationChartRef.current) {
        isolationChartRef.current.destroy();
      }
      if (aiInterestChartRef.current) {
        aiInterestChartRef.current.destroy();
      }
      if (wtpChartRef.current) {
        wtpChartRef.current.destroy();
      }
    };
  }, []);

  // Isolation Rate Chart (Bar)
  const isolationChartData = {
    labels: ['Isolation Rate'],
    datasets: [
      {
        label: 'Percentage of Students',
        data: [stats?.isolationRate * 100 || 73],
        backgroundColor: '#1D4ED8',
      },
    ],
  };

  // AI Interest Chart (Pie)
  const aiInterestChartData = {
    labels: ['Interested in AI Matching', 'Not Interested'],
    datasets: [
      {
        data: [stats?.aiInterest * 100 || 89, 100 - (stats?.aiInterest * 100 || 89)],
        backgroundColor: ['#1D4ED8', '#6B7280'],
      },
    ],
  };

  // Willingness to Pay Chart (Bar)
  const wtpChartData = {
    labels: ['Willingness to Pay'],
    datasets: [
      {
        label: 'Amount (USD)',
        data: [stats?.wtp || 15.40],
        backgroundColor: '#1D4ED8',
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 p-4">
      <h1 className="text-3xl font-bold mb-6 text-primary">Research Statistics</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {!stats ? (
        <p className="text-gray-500">Loading statistics...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Isolation Rate Chart */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Student Isolation Rate</h2>
            <Bar
              data={isolationChartData}
              options={{
                responsive: true,
                plugins: { title: { display: true, text: '73% Report Isolation' } },
                scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Percentage (%)' } } },
              }}
              ref={(el) => {
                if (el) isolationChartRef.current = el.chart;
              }}
            />
          </div>

          {/* AI Interest Chart */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">AI Matching Interest</h2>
            <Pie
              data={aiInterestChartData}
              options={{
                responsive: true,
                plugins: { title: { display: true, text: '89% Want AI Matching' } },
              }}
              ref={(el) => {
                if (el) aiInterestChartRef.current = el.chart;
              }}
            />
          </div>

          {/* Willingness to Pay Chart */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Willingness to Pay</h2>
            <Bar
              data={wtpChartData}
              options={{
                responsive: true,
                plugins: { title: { display: true, text: '$15.40 Average WTP' } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Amount (USD)' } } },
              }}
              ref={(el) => {
                if (el) wtpChartRef.current = el.chart;
              }}
            />
          </div>

          {/* Additional Stats */}
          <div className="bg-white p-4 rounded-lg shadow-md col-span-1 md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold mb-4">Platform Usage</h2>
            <p className="text-gray-700">Total Users: <strong>{stats.totalUsers || 0}</strong></p>
            <p className="text-gray-700">Total Study Sessions: <strong>{stats.totalSessions || 0}</strong></p>
            <Link
              to="/dashboard"
              className="mt-4 inline-block bg-primary text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;