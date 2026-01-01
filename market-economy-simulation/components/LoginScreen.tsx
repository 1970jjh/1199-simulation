import React, { useState } from 'react';
import { Users, Shield, Smartphone, ArrowRight, Play, Sun, Moon, Trash2, LogIn, Hash, Copy, Check, Plus, ChevronRight } from 'lucide-react';
import { GameRoomSummary, GamePhase } from '../types';

interface LoginScreenProps {
  onAdminStart: (roomName: string, teamCount: number) => void;
  onCreateRoom: (roomName: string, teamCount: number) => void;
  onAdminResume: () => void;
  onDeleteRoom: (roomId?: string) => void;
  onSelectRoom: (roomId: string) => void;
  onUserJoin: (name: string, teamId: number) => void;
  onJoinByCode: (code: string) => Promise<boolean>;
  existingTeams: number; // If 0, room doesn't exist
  roomName: string | null;
  roomCode: string;
  gameRooms: GameRoomSummary[];
  toggleTheme: () => void;
  isDarkMode: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onAdminStart,
  onCreateRoom,
  onAdminResume,
  onDeleteRoom,
  onSelectRoom,
  onUserJoin,
  onJoinByCode,
  existingTeams,
  roomName,
  roomCode,
  gameRooms,
  toggleTheme,
  isDarkMode
}) => {
  const [mode, setMode] = useState<'USER' | 'ADMIN'>('USER');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // User Inputs
  const [userName, setUserName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number>(1);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [selectedUserRoom, setSelectedUserRoom] = useState<GameRoomSummary | null>(null);

  // Admin Inputs
  const [adminPassword, setAdminPassword] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [teamCount, setTeamCount] = useState(3);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAdminLogin = () => {
    if (adminPassword !== '6749467') {
      setError('Invalid Password');
      return;
    }
    setError('');
    setIsAdminLoggedIn(true);
  };

  const handleAdminSubmit = () => {
    if (adminPassword !== '6749467') {
      setError('Invalid Password');
      return;
    }

    // Create new room
    if (!newRoomName) {
        setError('Enter Room Name');
        return;
    }
    // Create room without entering it
    onCreateRoom(newRoomName, teamCount);
    setNewRoomName('');
    setShowCreateForm(false);
    setError('');
    // Room will appear in the list via Firebase sync
  };

  const handleAdminDelete = (targetRoomId?: string) => {
      if (adminPassword !== '6749467') {
        setError('Invalid Password');
        return;
      }
      const roomToDelete = targetRoomId || roomCode;
      const roomInfo = gameRooms.find(r => r.roomId === roomToDelete);
      const roomDisplayName = roomInfo ? roomInfo.roomName : roomToDelete;

      if (window.confirm(`Are you sure you want to delete "${roomDisplayName}"? All data will be lost.`)) {
          onDeleteRoom(targetRoomId);
          if (!targetRoomId || targetRoomId === roomCode) {
            setAdminPassword('');
          }
          setError('');
      }
  };

  const handleEnterRoom = (targetRoomId: string) => {
    if (adminPassword !== '6749467') {
      setError('Invalid Password');
      return;
    }
    onSelectRoom(targetRoomId);
  };

  const getPhaseLabel = (phase: GamePhase) => {
    switch (phase) {
      case GamePhase.PLAYING: return 'Playing';
      case GamePhase.ENDED: return 'Ended';
      default: return 'Setup';
    }
  };

  const getPhaseColor = (phase: GamePhase) => {
    switch (phase) {
      case GamePhase.PLAYING: return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case GamePhase.ENDED: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800';
      default: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
    }
  };

  const handleUserSubmit = async () => {
    if (!userName) {
      setError('Enter your name');
      return;
    }
    if (!selectedUserRoom) {
      setError('Select a room first');
      return;
    }

    // First select the room, then join
    setIsJoining(true);
    try {
      const success = await onJoinByCode(selectedUserRoom.roomId);
      if (success) {
        // Room is now loaded, join the team
        onUserJoin(userName, selectedTeam);
      } else {
        setError('Failed to join room');
      }
    } catch (e) {
      setError('Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSelectUserRoom = (room: GameRoomSummary) => {
    setSelectedUserRoom(room);
    setSelectedTeam(1); // Reset team selection
    setError('');
  };

  const handleJoinByCode = async () => {
    if (!joinCode || joinCode.length !== 6) {
      setError('Enter 6-digit room code');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const success = await onJoinByCode(joinCode);
      if (!success) {
        setError('Room not found');
      }
    } catch (e) {
      setError('Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden bg-gray-100 dark:bg-slate-900 transition-colors">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 -z-20"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute top-40 -left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl -z-10 animate-pulse delay-1000"></div>

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 text-gray-700 dark:text-white hover:scale-110 transition-transform"
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/50 dark:border-white/10 w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="p-8 pb-4 text-center">
            <h1 className="text-2xl md:text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 font-mono tracking-tighter">
              Competition Market
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Market Economy Simulation Game</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700">
            <button
                onClick={() => { setMode('USER'); setError(''); }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'USER' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
                <Smartphone size={18} /> USER JOIN
            </button>
            <button
                onClick={() => { setMode('ADMIN'); setError(''); }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'ADMIN' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
                <Shield size={18} /> ADMIN
            </button>
        </div>

        {/* Form Content */}
        <div className="p-8 pt-6 space-y-5">
            {mode === 'USER' ? (
                <>
                    {!selectedUserRoom ? (
                        // Step 1: Show room list for user to select
                        <div className="space-y-4">
                            {gameRooms.length > 0 ? (
                                <>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                                        Select a Game Room ({gameRooms.filter(r => r.phase === GamePhase.PLAYING).length} active)
                                    </label>
                                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                        {gameRooms.filter(r => r.phase === GamePhase.PLAYING).map((room) => (
                                            <button
                                                key={room.roomId}
                                                onClick={() => handleSelectUserRoom(room)}
                                                className="w-full bg-gray-50 dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-gray-800 dark:text-white truncate">{room.roomName}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">#{room.roomId}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getPhaseColor(room.phase)}`}>
                                                                Round {room.currentRound}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-2">
                                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                            {room.teamCount} Teams
                                                        </span>
                                                        <ChevronRight size={20} className="text-gray-400" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    {gameRooms.filter(r => r.phase === GamePhase.PLAYING).length === 0 && (
                                        <div className="text-center py-4 text-gray-500">
                                            <p className="font-bold">No active games available.</p>
                                            <p className="text-xs mt-2">Wait for admin to create a game.</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="font-bold">No games available.</p>
                                    <p className="text-xs mt-2">Wait for admin to create a game room.</p>
                                </div>
                            )}

                            {/* Optional: Room Code Input for direct join */}
                            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">Or enter room code directly</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="123456"
                                        maxLength={6}
                                        className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono text-lg tracking-widest text-center"
                                    />
                                    <button
                                        onClick={async () => {
                                            if (joinCode.length === 6) {
                                                const room = gameRooms.find(r => r.roomId === joinCode);
                                                if (room) {
                                                    handleSelectUserRoom(room);
                                                } else {
                                                    // Try to fetch from Firebase
                                                    setIsJoining(true);
                                                    const success = await onJoinByCode(joinCode);
                                                    setIsJoining(false);
                                                    if (!success) {
                                                        setError('Room not found');
                                                    }
                                                }
                                            }
                                        }}
                                        disabled={isJoining || joinCode.length !== 6}
                                        className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isJoining ? '...' : <ArrowRight size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Step 2: Selected room - enter name and team
                        <>
                            {/* Selected Room Info */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-blue-800 dark:text-blue-300">{selectedUserRoom.roomName}</h3>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">#{selectedUserRoom.roomId} • Round {selectedUserRoom.currentRound}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUserRoom(null)}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Change Room
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Your Name</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Select Team</label>
                                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {Array.from({ length: selectedUserRoom.teamCount }, (_, i) => i + 1).map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setSelectedTeam(num)}
                                            className={`
                                                py-2 rounded-lg font-bold font-mono transition-all
                                                ${selectedTeam === num
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                                                }
                                            `}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleUserSubmit}
                                disabled={isJoining}
                                className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isJoining ? 'Joining...' : <>JOIN GAME <ArrowRight size={20} /></>}
                            </button>
                        </>
                    )}
                </>
            ) : (
                <>
                    {/* Admin Login Form - Show first */}
                    {!isAdminLoggedIn ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Admin Password</label>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    placeholder="Enter password"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={handleAdminLogin}
                                className="w-full py-4 mt-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
                            >
                                <LogIn size={20} /> LOGIN
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Logged in indicator */}
                            <div className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                <span className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                                    <Check size={16} /> Admin Logged In
                                </span>
                                <button
                                    onClick={() => {
                                        setIsAdminLoggedIn(false);
                                        setAdminPassword('');
                                    }}
                                    className="text-xs text-gray-500 hover:text-red-500 transition"
                                >
                                    Logout
                                </button>
                            </div>

                            {/* Game Rooms List - Always show this section */}
                            {!showCreateForm && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                                            Game Rooms {gameRooms.length > 0 && `(${gameRooms.length})`}
                                        </label>
                                    </div>
                                    {gameRooms.length > 0 ? (
                                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                            {gameRooms.map((room) => (
                                                <div
                                                    key={room.roomId}
                                                    className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-slate-700"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-gray-800 dark:text-white truncate">{room.roomName}</h3>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">#{room.roomId}</span>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${getPhaseColor(room.phase)}`}>
                                                                    {getPhaseLabel(room.phase)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 ml-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                R{room.currentRound} | {room.teamCount} teams
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleAdminDelete(room.roomId)}
                                                            className="flex-1 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-1 text-sm"
                                                        >
                                                            <Trash2 size={14} /> Delete
                                                        </button>
                                                        <button
                                                            onClick={() => handleEnterRoom(room.roomId)}
                                                            className="flex-[2] py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-1 text-sm"
                                                        >
                                                            Enter <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
                                            <p className="font-medium">개설된 방이 없습니다</p>
                                            <p className="text-xs mt-1">아래 버튼을 눌러 새 방을 만드세요</p>
                                        </div>
                                    )}
                                    {/* Add New Room Button - Always visible when not in create mode */}
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} /> 새 방 만들기
                                    </button>
                                </div>
                            )}

                            {/* Create New Room Form */}
                            {showCreateForm && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">새 방 만들기</label>
                                        <button
                                            onClick={() => setShowCreateForm(false)}
                                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                                        >
                                            ← 목록으로
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Room Name</label>
                                        <input
                                            type="text"
                                            value={newRoomName}
                                            onChange={(e) => setNewRoomName(e.target.value)}
                                            placeholder="e.g. Class A Economy"
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Number of Teams: <span className="text-purple-500">{teamCount}</span></label>
                                        <input
                                            type="range"
                                            min="3"
                                            max="20"
                                            value={teamCount}
                                            onChange={(e) => setTeamCount(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                                            <span>3 Teams</span>
                                            <span>20 Teams</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAdminSubmit}
                                        className="w-full py-4 mt-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
                                    >
                                        CREATE ROOM <Play size={20} fill="currentColor" />
                                    </button>
                                </div>
                            )}

                        </>
                    )}
                </>
            )}

            {error && (
                <div className="text-red-500 text-sm font-bold text-center animate-bounce">
                    {error}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
