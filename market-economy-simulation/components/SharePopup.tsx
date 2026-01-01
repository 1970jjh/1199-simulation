import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Link, QrCode, Hash } from 'lucide-react';

interface SharePopupProps {
  roomCode: string;
  roomName: string;
  onClose: () => void;
}

export const SharePopup: React.FC<SharePopupProps> = ({
  roomCode,
  roomName,
  onClose
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Generate the full URL with room code
  const accessUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(accessUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <QrCode size={24} />
                게임 참여 안내
              </h2>
              <p className="text-sm opacity-80 mt-1">{roomName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl shadow-inner border-4 border-gray-100">
              <QRCodeSVG
                value={accessUrl}
                size={180}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#1e293b"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
              QR 코드를 스캔하여 참여하세요
            </p>
          </div>

          {/* Room Code */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold flex items-center gap-1">
                  <Hash size={12} /> 접속 코드
                </p>
                <p className="text-3xl font-mono font-bold text-gray-800 dark:text-white tracking-widest mt-1">
                  {roomCode}
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className={`p-3 rounded-xl transition ${
                  copiedCode
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500'
                }`}
              >
                {copiedCode ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          {/* Access Link */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold flex items-center gap-1 mb-2">
              <Link size={12} /> 접속 링크
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={accessUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-mono text-gray-700 dark:text-gray-300 truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 ${
                  copiedLink
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check size={16} /> 복사됨
                  </>
                ) : (
                  <>
                    <Copy size={16} /> 복사
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>참가자들에게 QR 코드를 보여주거나</p>
            <p>접속 코드/링크를 공유하세요</p>
          </div>
        </div>
      </div>
    </div>
  );
};
