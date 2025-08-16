import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './components/login';
import Register from './components/register';
import Dashboard from './components/dashboard';
import StudyRoom from './components/studyroom';
import Stats from './components/stats';
import FileShare from './components/fileshare';
import { Popover, PopoverTrigger, PopoverContent } from '@radix-ui/react-popover';

function App() {
  return (
    <Router>
      <nav className="bg-primary text-white p-4">
        <div className="container mx-auto flex justify-between">
          <Link to="/" className="text-2xl font-bold">StudySync</Link>
          <div>
            <Link to="/dashboard" className="mr-4">Dashboard</Link>
            <Link to="/stats" className="mr-4">Research Stats</Link>
            <Link to="/files">Files</Link>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/room/:roomId" element={<StudyRoom />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/files" element={<FileShare />} />
        </Routes>
        <Popover>
          <PopoverTrigger className="fixed bottom-4 right-4 bg-primary text-white p-2 rounded-full">?</PopoverTrigger>
          <PopoverContent className="bg-white p-4 shadow-lg rounded">
            <h4>Microlearning Tip</h4>
            <p>Schedule study sessions in short bursts (25min) for optimal retention (Johnson et al., 2023).</p>
          </PopoverContent>
        </Popover>
      </div>
    </Router>
  );
}

export default App;