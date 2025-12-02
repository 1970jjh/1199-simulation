import React, { useState } from 'react';
import { Users, Shield, Smartphone, ArrowRight, Play, Sun, Moon, Trash2, LogIn, Hash, Copy, Check } from 'lucide-react';

interface LoginScreenProps {
  onAdminStart: (roomName: string, teamCount: number) => void;
  onAdminResume: () => void;
  onDeleteRoom: () => void;
  onUserJoin: (name: string, teamId: number) => void;
  onJoinByCode: (code: string) => Promise<boolean>;
  existingTeams: number; // If 0, room doesn't exist
  roomName: string | null;
  roomCode: string;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onAdminStart,
  onAdminResume,
  onDeleteRoom,
  onUserJoin,
  onJoinByCode,
  existingTeams,
  roomName,
  roomCode,
  toggleTheme,
  isDarkMode
}) => {
  const [mode, setMode] = useState<'USER' | 'ADMIN'>('USER');

  // User Inputs
  const [userName, setUserName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number>(1);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Admin Inputs
  const [adminPassword, setAdminPassword] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [teamCount, setTeamCount] = useState(3);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAdminSubmit = () => {
    if (adminPassword !== '6749467') {
      setError('Invalid Password');
      return;
    }

    // If room exists, this button acts as RESUME
    if (existingTeams > 0) {
        onAdminResume();
    } else {
        // Create new room
        if (!newRoomName) {
            setError('Enter Room Name');
            return;
        }
        onAdminStart(newRoomName, teamCount);
    }
  };

  const handleAdminDelete = () => {
      if (adminPassword !== '6749467') {
        setError('Invalid Password');
        return;
      }
      if (window.confirm("Are you sure you want to delete this room? All data will be lost.")) {
          onDeleteRoom();
          setAdminPassword('');
          setError('');
      }
  };

  const handleUserSubmit = () => {
    if (!userName) {
      setError('Enter your name');
      return;
    }
    // If room exists, join.
    onUserJoin(userName, selectedTeam);
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
            <h1 className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 font-mono tracking-tighter">
              MARKET SIM
            </h1>
            {existingTeams > 0 && roomName && (
              <div className="space-y-2 mt-2">
                <div className="inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800 animate-pulse">
                    Active Room: {roomName}
                </div>
                {roomCode && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="px-4 py-2 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center gap-2">
                      <Hash size={16} className="text-gray-400" />
                      <span className="font-mono font-bold text-lg tracking-widest text-gray-800 dark:text-white">{roomCode}</span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                      title="Copy room code"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                )}
              </div>
            )}
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
                    {existingTeams === 0 ? (
                         <div className="space-y-5">
                            <div className="text-center py-4 text-gray-500">
                                <p className="font-bold">No active game found.</p>
                                <p className="text-xs mt-2">Enter room code to join a game.</p>
                            </div>

                            {/* Room Code Input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Room Code (6 digits)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="123456"
                                        maxLength={6}
                                        className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono text-xl tracking-widest text-center"
                                    />
                                    <button
                                        onClick={handleJoinByCode}
                                        disabled={isJoining || joinCode.length !== 6}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isJoining ? '...' : <><LogIn size={20} /></>}
                                    </button>
                                </div>
                            </div>
                         </div>
                    ) : (
                        <>
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
                                    {Array.from({ length: existingTeams }, (_, i) => i + 1).map(num => (
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
                                className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                            >
                                JOIN GAME <ArrowRight size={20} />
                            </button>
                        </>
                    )}
                </>
            ) : (
                <>
                    {existingTeams > 0 ? (
                        /* RESUME / DELETE MODE */
                        <div className="space-y-4">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 text-center">
                                <p className="text-yellow-800 dark:text-yellow-200 font-bold text-sm">Room is currently active!</p>
                                <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">Enter password to resume or delete.</p>
                            </div>

                            {/* Share buttons */}
                            {roomCode && (
                              <div className="flex gap-2">
                                <button
                                  onClick={handleCopyCode}
                                  className="flex-1 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 text-sm"
                                >
                                  {copied ? <Check size={16} /> : <Copy size={16} />} Copy Code
                                </button>
                                <button
                                  onClick={handleCopyLink}
                                  className="flex-1 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition flex items-center justify-center gap-2 text-sm"
                                >
                                  {copied ? <Check size={16} /> : <Copy size={16} />} Copy Link
                                </button>
                              </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Admin Password</label>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleAdminDelete}
                                    className="flex-1 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} /> DELETE
                                </button>
                                <button
                                    onClick={handleAdminSubmit}
                                    className="flex-[2] py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
                                >
                                    RESUME <LogIn size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* CREATE MODE */
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Admin Password</label>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                />
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
