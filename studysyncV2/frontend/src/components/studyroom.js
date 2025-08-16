import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import Confetti from 'react-confetti';
import { Share, Upload, Mic, Link2, BarChart2 } from 'lucide-react';

const socket = io('http://localhost:3001', { transports: ['websocket'] });

const StudyRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [sharedNotes, setSharedNotes] = useState('');
  const [tempNotes, setTempNotes] = useState('');
  const [whiteboard, setWhiteboard] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [groupProgress, setGroupProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState(null);
  const [pollActive, setPollActive] = useState(false);
  const [pollVotes, setPollVotes] = useState({ yes: 0, no: 0 });
  const [screenStream, setScreenStream] = useState(null);
  const [sessionData, setSessionData] = useState({
    messages_sent: 0,
    notes_shared: 0,
    files_uploaded: 0,
    poll_votes: 0
  });
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const hasMounted = useRef(false);

  const saveContent = async (chatData, notesData, whiteboardData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to save content.');
        return;
      }
      await axios.post(
        `${process.env.REACT_APP_API_URL}/room/${roomId}`,
        { chat: chatData, notes: notesData, whiteboard: whiteboardData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setError(null);
    } catch (err) {
      console.error('Save room content error:', err.response?.data?.error || err.message);
      setError(`Failed to save content: ${err.response?.data?.error || err.message}`);
    }
  };

  const saveSessionData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const hours_spent = (Date.now() - startTimeRef.current) / 3600000;
      await axios.post(
        `${process.env.REACT_APP_API_URL}/session/${roomId}`,
        {
          user_id: JSON.parse(atob(token.split('.')[1])).id,
          hours_spent,
          ...sessionData
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setError(null);
    } catch (err) {
      console.error('Save session data error:', err.response?.data?.error || err.message);
      setError(`Failed to save session data: ${err.response?.data?.error || err.message}`);
    }
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in to access the study room.');
          return;
        }
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/room/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChat(Array.isArray(response.data.chat) ? response.data.chat : []);
        setSharedNotes(response.data.notes || '');
        const strokes = Array.isArray(response.data.whiteboard) ? response.data.whiteboard : [];
        setWhiteboard(strokes);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#000';
          strokes.forEach(({ x, y }) => {
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
          });
          ctx.beginPath();
        }
      } catch (err) {
        setError(`Failed to load room content: ${err.response?.data?.error || err.message}`);
      }
    };
    loadContent();

    socket.emit('join-room', roomId);

    socket.on('chat-message', (msg) => {
      setChat((prev) => {
        const newChat = [...prev, { text: msg, timestamp: new Date().toLocaleTimeString() }];
        saveContent(newChat, sharedNotes, whiteboard);
        return newChat;
      });
      setActivityFeed((prev) => [...prev, { text: `New message sent`, timestamp: new Date().toLocaleTimeString() }]);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    socket.on('user-joined', (userId) => {
      setParticipants((prev) => [
        ...new Set([...prev, { id: userId, name: `User ${userId.slice(0, 8)}`, online: true }]),
      ]);
      setChat((prev) => {
        const newChat = [...prev, { text: `User ${userId.slice(0, 8)} joined`, timestamp: new Date().toLocaleTimeString() }];
        saveContent(newChat, sharedNotes, whiteboard);
        return newChat;
      });
      setActivityFeed((prev) => [
        ...prev,
        { text: `User ${userId.slice(0, 8)} joined`, timestamp: new Date().toLocaleTimeString() },
      ]);
    });

    socket.on('user-disconnected', (userId) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, online: false } : p))
      );
      setChat((prev) => {
        const newChat = [...prev, { text: `User ${userId.slice(0, 8)} disconnected`, timestamp: new Date().toLocaleTimeString() }];
        saveContent(newChat, sharedNotes, whiteboard);
        return newChat;
      });
      setActivityFeed((prev) => [
        ...prev,
        { text: `User ${userId.slice(0, 8)} disconnected`, timestamp: new Date().toLocaleTimeString() },
      ]);
    });

    socket.on('typing', (userId) => {
      setIsTyping(true);
      setTypingUser(userId);
      setTimeout(() => setIsTyping(false), 3000);
    });

    socket.on('file-uploaded', (filename, userId) => {
      setChat((prev) => {
        const newChat = [
          ...prev,
          { text: `User ${userId.slice(0, 8)} uploaded ${filename}`, timestamp: new Date().toLocaleTimeString() },
        ];
        saveContent(newChat, sharedNotes, whiteboard);
        return newChat;
      });
      setActivityFeed((prev) => [
        ...prev,
        { text: `User ${userId.slice(0, 8)} uploaded ${filename}`, timestamp: new Date().toLocaleTimeString() },
      ]);
      if (userId === socket.id) {
        setSessionData((prev) => ({ ...prev, files_uploaded: prev.files_uploaded + 1 }));
      }
    });

    socket.on('draw', ({ x, y }) => {
      setWhiteboard((prev) => {
        const newWhiteboard = [...prev, { x, y }];
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y);
        }
        return newWhiteboard;
      });
    });

    socket.on('shared-notes', (notes) => {
      setSharedNotes(notes);
      setActivityFeed((prev) => [...prev, { text: `Shared notes updated`, timestamp: new Date().toLocaleTimeString() }]);
    });

    socket.on('poll-created', () => {
      setPollActive(true);
    });

    socket.on('poll-vote', (voteType) => {
      setPollVotes((prev) => ({
        yes: voteType === 'yes' ? prev.yes + 1 : prev.yes,
        no: voteType === 'no' ? prev.no + 1 : prev.no,
      }));
    });

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
    }

    const draw = (e) => {
      if (!drawing || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      socket.emit('draw', roomId, { x, y });
      setWhiteboard((prev) => {
        const newWhiteboard = [...prev, { x, y }];
        saveContent(chat, sharedNotes, newWhiteboard);
        return newWhiteboard;
      });
      setActivityFeed((prev) => [...prev, { text: `Drawing updated`, timestamp: new Date().toLocaleTimeString() }]);
    };

    if (canvas) {
      canvas.addEventListener('mousedown', () => setDrawing(true));
      canvas.addEventListener('mouseup', () => setDrawing(false));
      canvas.addEventListener('mousemove', draw);
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 3600000;
      setGroupProgress(elapsed);
      if (elapsed > 1) setShowConfetti(true);
    }, 1000);

    hasMounted.current = true;

    return () => {
      socket.off('chat-message');
      socket.off('user-joined');
      socket.off('user-disconnected');
      socket.off('typing');
      socket.off('file-uploaded');
      socket.off('draw');
      socket.off('shared-notes');
      socket.off('poll-created');
      socket.off('poll-vote');
      if (canvas) {
        canvas.removeEventListener('mousedown', () => setDrawing(true));
        canvas.removeEventListener('mouseup', () => setDrawing(false));
        canvas.removeEventListener('mousemove', draw);
      }
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
      saveSessionData();
      clearInterval(interval);
    };
  }, [roomId, screenStream, sharedNotes, whiteboard, chat]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('chat-message', roomId, message);
      setSessionData((prev) => ({ ...prev, messages_sent: prev.messages_sent + 1 }));
      setMessage('');
    }
  };

  const handleTyping = () => {
    if (message.trim()) {
      socket.emit('typing', roomId, `User ${socket.id.slice(0, 8)}`);
    }
  };

  const handleNotesChange = (e) => {
    setTempNotes(e.target.value);
  };

  const sendNotes = () => {
    if (tempNotes.trim()) {
      setSharedNotes(tempNotes);
      socket.emit('shared-notes', roomId, tempNotes);
      saveContent(chat, tempNotes, whiteboard);
      setActivityFeed((prev) => [...prev, { text: `Shared notes sent`, timestamp: new Date().toLocaleTimeString() }]);
      setSessionData((prev) => ({ ...prev, notes_shared: prev.notes_shared + 1 }));
      setTempNotes('');
    }
  };

  const sendEmote = (emote) => {
    socket.emit('chat-message', roomId, emote);
    setSessionData((prev) => ({ ...prev, messages_sent: prev.messages_sent + 1 }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to upload files.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setError(null);
      socket.emit('file-uploaded', roomId, file.name, socket.id);
    } catch (err) {
      setError(`Upload failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const startPoll = () => {
    setPollActive(true);
    socket.emit('poll-created', roomId);
    setActivityFeed((prev) => [...prev, { text: `Poll created: Ready for quiz?`, timestamp: new Date().toLocaleTimeString() }]);
  };

  const votePoll = (vote) => {
    socket.emit('poll-vote', roomId, vote);
    setSessionData((prev) => ({ ...prev, poll_votes: prev.poll_votes + 1 }));
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActivityFeed((prev) => [...prev, { text: `Screen sharing started`, timestamp: new Date().toLocaleTimeString() }]);
      socket.emit('share-screen', roomId, 'Screen sharing started');
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        socket.emit('share-screen', roomId, 'Screen sharing stopped');
        setActivityFeed((prev) => [...prev, { text: `Screen sharing stopped`, timestamp: new Date().toLocaleTimeString() }]);
      };
    } catch (err) {
      setError('Failed to start screen sharing: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-b from-gray-100 to-gray-200 font-sans">
      {showConfetti && <Confetti recycle={false} />}
      {/* Sidebar: Participant List */}
      <div className="w-full md:w-80 p-6 bg-white border-r shadow-lg overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-primary flex items-center">
          <span className="mr-2">👥</span> Participants ({participants.length})
        </h2>
        {participants.length > 0 ? (
          <ul className="space-y-3">
            {participants.map((participant, i) => (
              <li key={i} className="flex items-center text-gray-700 hover:bg-gray-100 p-2 rounded transition">
                <span className={`w-3 h-3 rounded-full mr-3 ${participant.online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                {participant.name}
                <img
                  src={`https://ui-avatars.com/api/?name=${participant.name}&background=0D8ABC&color=fff`}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full ml-auto"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No participants yet. Invite friends!</p>
        )}
        <h2 className="text-xl font-bold mt-6 mb-4 text-primary flex items-center">
          <span className="mr-2">📋</span> Activity Feed
        </h2>
        <ul className="space-y-2 text-gray-600 text-sm overflow-y-auto h-40 bg-gray-50 p-3 rounded-lg">
          {activityFeed.map((activity, i) => (
            <li key={i} className="p-2 bg-white rounded shadow-sm animate-fade-in">
              {activity.timestamp} - {activity.text}
            </li>
          ))}
        </ul>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          onClick={saveSessionData}
        >
          <span className="mr-2">🚪</span> Leave Room
        </Link>
      </div>

      {/* Main Area: Chat and Whiteboard */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Error Message */}
        {error && (
          <p className="text-red-500 p-4 bg-red-100 border-b border-red-200 animate-pulse">{error}</p>
        )}

        {/* Toolbar */}
        <div className="p-4 bg-primary text-white flex flex-wrap gap-4 shadow-md sticky top-0 z-10">
          <button
            onClick={startScreenShare}
            className="p-2 bg-white text-primary rounded-lg hover:bg-gray-200 transition flex items-center"
            aria-label="Share screen"
          >
            <Share className="w-5 h-5 mr-2" /> Share Screen
          </button>
          <label className="p-2 bg-white text-primary rounded-lg hover:bg-gray-200 transition flex items-center cursor-pointer">
            <Upload className="w-5 h-5 mr-2" />
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="Upload file"
            />
            Upload File
          </label>
          <button
            onClick={() => alert('Voice Chat: Coming soon!')}
            className="p-2 bg-white text-primary rounded-lg hover:bg-gray-200 transition flex items-center"
            aria-label="Start voice chat"
          >
            <Mic className="w-5 h-5 mr-2" /> Voice Chat
          </button>
          <button
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              alert('Room URL copied to clipboard!');
            }}
            className="p-2 bg-white text-primary rounded-lg hover:bg-gray-200 transition flex items-center"
            aria-label="Share room link"
          >
            <Link2 className="w-5 h-5 mr-2" /> Share Room
          </button>
          <button
            onClick={startPoll}
            className="p-2 bg-white text-primary rounded-lg hover:bg-gray-200 transition flex items-center"
            aria-label="Create poll"
          >
            <BarChart2 className="w-5 h-5 mr-2" /> Create Poll
          </button>
          <div className="flex gap-2">
            <button onClick={() => sendEmote('👍')} className="p-2 text-2xl hover:bg-gray-200 rounded transition">👍</button>
            <button onClick={() => sendEmote('😊')} className="p-2 text-2xl hover:bg-gray-200 rounded transition">😊</button>
            <button onClick={() => sendEmote('?')} className="p-2 text-2xl hover:bg-gray-200 rounded transition">?</button>
          </div>
        </div>

        {/* Screen Share */}
        {screenStream && (
          <div className="p-4 bg-white border-b">
            <h2 className="text-xl font-bold mb-2 text-primary flex items-center">
              <span className="mr-2">🖥️</span> Screen Share
            </h2>
            <video ref={videoRef} autoPlay className="w-full h-64 rounded-lg shadow-md" />
          </div>
        )}

        {/* Poll Section */}
        {pollActive && (
          <div className="p-4 bg-white border-b shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-primary flex items-center">
              <span className="mr-2">📊</span> Poll: Ready for quiz?
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => votePoll('yes')}
                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                Yes ({pollVotes.yes})
              </button>
              <button
                onClick={() => votePoll('no')}
                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                No ({pollVotes.no})
              </button>
            </div>
          </div>
        )}

        {/* Chatbox */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          <h2 className="text-xl font-bold mb-4 text-primary flex items-center">
            <span className="mr-2">💬</span> Chat
          </h2>
          {chat.length > 0 ? (
            <ul className="space-y-3">
              {chat.map((msg, i) => (
                <li key={i} className="p-3 bg-white rounded-lg shadow-sm animate-fade-in">
                  <span className="text-gray-500 text-sm">{msg.timestamp}</span>
                  <p className="text-gray-800">{msg.text}</p>
                </li>
              ))}
              <div ref={chatEndRef} />
            </ul>
          ) : (
            <p className="text-gray-500 italic">No messages yet. Start the conversation!</p>
          )}
          {isTyping && (
            <p className="text-gray-500 mt-3 animate-pulse">{typingUser} is typing...</p>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-white flex gap-3">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleTyping}
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Type a message..."
            aria-label="Chat message input"
          />
          <button
            onClick={sendMessage}
            className="p-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
            aria-label="Send message"
          >
            Send
          </button>
        </div>

        {/* Shared Notes */}
        <div className="p-6 border-t bg-white">
          <h2 className="text-xl font-bold mb-4 text-primary flex items-center">
            <span className="mr-2">📝</span> Shared Notes
          </h2>
          <textarea
            value={tempNotes}
            onChange={handleNotesChange}
            className="w-full h-32 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Type shared notes here..."
            aria-label="Shared notes"
          />
          <button
            onClick={sendNotes}
            className="mt-3 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            aria-label="Send notes"
          >
            Send Notes
          </button>
          {sharedNotes && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700">Current Notes:</h3>
              <p className="text-gray-600">{sharedNotes}</p>
            </div>
          )}
        </div>

        {/* Whiteboard */}
        <div className="p-6 border-t bg-white">
          <h2 className="text-xl font-bold mb-4 text-primary flex items-center">
            <span className="mr-2">🎨</span> Whiteboard
          </h2>
          <canvas
            ref={canvasRef}
            className="w-full h-64 bg-gray-100 border rounded-lg cursor-crosshair shadow-md"
            width="800"
            height="256"
          ></canvas>
        </div>

        {/* Group Progress */}
        <div className="p-6 border-t bg-white">
          <h2 className="text-xl font-bold mb-4 text-primary flex items-center">
            <span className="mr-2">⏳</span> Group Progress
          </h2>
          <p className="text-gray-700">Time in Room: <strong>{groupProgress.toFixed(2)} hours</strong></p>
        </div>
      </div>
    </div>
  );
};

export default StudyRoom;