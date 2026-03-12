import React, { useState, useRef } from 'react';
import { Team, AIAnalysisReport } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, RefreshCw, FileText, Download, Sparkles, Key, Image as ImageIcon, Camera } from 'lucide-react';
import { generateGameAnalysis, generateWinnerPoster } from '../utils/aiService';
import html2canvas from 'html2canvas';

interface FinalResultsProps {
  teams: Team[];
  roundHistory: any[];
  onRestart: () => void;
  roomName: string;
}

export const FinalResults: React.FC<FinalResultsProps> = ({ teams, roundHistory, onRestart, roomName }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisReport | null>(null);

  // Poster Generation State
  const [winnerPhoto, setWinnerPhoto] = useState<string | null>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sortedTeams[0];

  const rounds = teams[0].history.length;
  const chartData = [];

  const initialPoint: any = { name: 'Start' };
  teams.forEach(t => initialPoint[t.name] = 0);
  chartData.push(initialPoint);

  for (let r = 0; r < rounds; r++) {
    const dataPoint: any = { name: `R${r+1}` };
    teams.forEach(t => {
      dataPoint[t.name] = t.history[r].totalAfterRound;
    });
    chartData.push(dataPoint);
  }

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

  const handleAnalyze = async () => {
    if (!apiKey) {
      alert("Please enter a Google Gemini API Key first.");
      setShowKeyInput(true);
      return;
    }

    setIsAnalyzing(true);
    try {
      const report = await generateGameAnalysis(apiKey, teams, roundHistory || []);
      setAnalysis(report);
    } catch (error) {
      alert("Analysis failed. Check console or API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setWinnerPhoto(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGeneratePoster = async () => {
      if (!apiKey) {
        alert("Please enter API Key first.");
        setShowKeyInput(true);
        return;
      }
      if (!winnerPhoto) return;

      setIsGeneratingPoster(true);
      try {
          // Pass full data URL so service can handle mime type
          const poster = await generateWinnerPoster(apiKey, winnerPhoto, winner.name, winner.totalScore);
          setPosterUrl(poster);
      } catch (e) {
          console.error(e);
          alert("Failed to generate poster. Ensure your API key supports Gemini image generation. Error: " + (e instanceof Error ? e.message : String(e)));
      } finally {
          setIsGeneratingPoster(false);
      }
  };

  const handleDownloadHTML = async () => {
    if (!contentRef.current) return;

    // Hide control buttons during capture
    const btnSection = document.getElementById('control-buttons');
    if (btnSection) btnSection.style.display = 'none';

    try {
      // 1. Capture chart as image (Recharts SVG won't render in standalone HTML)
      const chartEl = contentRef.current.querySelector('.recharts-responsive-container')?.closest('.lg\\:col-span-2') as HTMLElement | null;
      let chartImageDataUrl = '';
      if (chartEl) {
        const chartCanvas = await html2canvas(chartEl, {
          scale: 2,
          backgroundColor: null,
          logging: false,
          useCORS: true,
        });
        chartImageDataUrl = chartCanvas.toDataURL('image/png');
      }

      // 2. Collect all CSS from document
      let allCSS = '';
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            allCSS += rule.cssText + '\n';
          }
        } catch (_e) {
          // Cross-origin stylesheets can't be accessed
        }
      }

      // 3. Build HTML content sections

      // Winner Banner
      const bannerEl = contentRef.current.querySelector('.relative.overflow-hidden.bg-gradient-to-r');
      const bannerHTML = bannerEl ? bannerEl.outerHTML : '';

      // Poster image (if generated) - standalone section without upload UI
      let posterHTML = '';
      if (posterUrl) {
        posterHTML = `
          <div style="background:white;padding:24px;border-radius:24px;border:1px solid #e5e7eb;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
            <h3 style="font-size:20px;font-weight:bold;font-family:monospace;margin-bottom:16px;display:flex;align-items:center;gap:8px;color:#a855f6;">
              WINNER POSTER
            </h3>
            <div style="border-radius:12px;overflow:hidden;border:4px solid rgba(234,179,8,0.3);box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
              <img src="${posterUrl}" style="width:100%;height:auto;display:block;" />
            </div>
          </div>
        `;
      }

      // Leaderboard table
      const leaderboardEl = contentRef.current.querySelector('.lg\\:col-span-1');
      const leaderboardHTML = leaderboardEl ? leaderboardEl.outerHTML : '';

      // Chart as image
      const chartHTML = chartImageDataUrl
        ? `<div class="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
             <h3 style="font-size:20px;font-weight:bold;font-family:monospace;margin-bottom:24px;color:#9ca3af;">ASSET GROWTH ANALYSIS</h3>
             <img src="${chartImageDataUrl}" style="width:100%;height:auto;border-radius:8px;" />
           </div>`
        : '';

      // AI Analysis section
      const analysisEl = contentRef.current.querySelector('.border-purple-500\\/20');
      const analysisHTML = analysisEl ? analysisEl.outerHTML : '';

      // 4. Detect dark mode
      const isDark = document.documentElement.classList.contains('dark');

      // 5. Build complete standalone HTML
      const htmlContent = `<!DOCTYPE html>
<html lang="ko" class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${roomName} - Game Report</title>
  <style>
    ${allCSS}
    /* Ensure dark mode works in standalone file */
    @media (prefers-color-scheme: dark) {
      html:not(.light) { color-scheme: dark; }
    }
    /* Remove print:hidden for downloaded file */
    .print\\:hidden { display: block !important; }
    /* Ensure images are contained */
    img { max-width: 100%; height: auto; }
    /* Fix body background */
    body { margin: 0; padding: 0; }
  </style>
</head>
<body class="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white">
  <div class="max-w-7xl mx-auto space-y-8 p-4 md:p-8" style="background:inherit;">

    ${bannerHTML}

    ${posterHTML}

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      ${leaderboardHTML}
      ${chartHTML}
    </div>

    ${analysisHTML}

  </div>
</body>
</html>`;

      // 6. Download
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      a.href = url;
      a.download = `${roomName}${dateStr}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("HTML Export failed", e);
      alert("Failed to create HTML report");
    } finally {
      if (btnSection) btnSection.style.display = 'flex';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8 text-gray-900 dark:text-white">
      {/* Top Controls */}
      <div className="max-w-7xl mx-auto flex justify-end gap-2 mb-4 print:hidden">
         <button
           onClick={() => setShowKeyInput(!showKeyInput)}
           className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-slate-700"
         >
           <Key size={16} /> {apiKey ? 'API Key Set' : 'Set API Key'}
         </button>
      </div>

      {showKeyInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Enter Google Gemini API Key</h3>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-3 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowKeyInput(false)} className="px-4 py-2 text-gray-500 font-bold">Close</button>
                <button onClick={() => setShowKeyInput(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Save</button>
              </div>
           </div>
        </div>
      )}

      <div ref={contentRef} className="max-w-7xl mx-auto space-y-8 bg-gray-50 dark:bg-slate-950 p-4">

        {/* Winner Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-10 text-white shadow-2xl text-center border border-white/10 print:break-inside-avoid">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-4 p-4 bg-yellow-500/20 rounded-full backdrop-blur-md border border-yellow-500/50">
                <Trophy size={48} className="text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-widest text-blue-200 mb-2">Simulation Complete</h2>
            <h1 className="text-5xl md:text-7xl font-black mb-6 drop-shadow-2xl">{winner.name} Wins</h1>
            <div className="text-5xl font-mono font-bold bg-white/10 inline-block px-8 py-4 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
               {winner.totalScore}억
            </div>
          </div>
        </div>

        {/* Poster Generator Section (Only visible on screen) */}
        <div className="print:hidden bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
            <h3 className="text-xl font-bold font-mono mb-4 flex items-center gap-2">
                <Camera className="text-purple-500" />
                WINNER POSTER GENERATOR (우승팀 포스터)
            </h3>
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Upload a photo of the winning team to generate a cinematic "Market Master" poster using Gemini AI.
                    </p>
                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 flex items-center gap-2 transition">
                            <ImageIcon size={20} />
                            <span>Upload Photo</span>
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                        {winnerPhoto && <span className="text-green-500 text-sm font-bold">Photo Loaded!</span>}
                    </div>
                    {winnerPhoto && (
                        <div className="w-full max-w-[200px] h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 relative">
                             <img src={winnerPhoto} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <button
                        onClick={handleGeneratePoster}
                        disabled={!winnerPhoto || isGeneratingPoster}
                        className={`
                            px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all w-full md:w-auto
                            ${!winnerPhoto ? 'bg-gray-300 cursor-not-allowed' : isGeneratingPoster ? 'bg-purple-400 cursor-wait' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105'}
                        `}
                    >
                        {isGeneratingPoster ? 'Generating AI Art...' : 'Generate Cinematic Poster'}
                    </button>
                </div>

                {posterUrl && (
                    <div className="flex-1 animate-in zoom-in duration-500">
                        <div className="relative group rounded-xl overflow-hidden shadow-2xl border-4 border-yellow-500/30">
                            <img src={posterUrl} alt="Winner Poster" className="w-full h-auto" />
                            <a
                                href={posterUrl}
                                download={`winner_poster_${winner.name}.png`}
                                className="absolute bottom-4 right-4 bg-white text-black px-4 py-2 rounded-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                                Download Poster
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Leaderboard Table */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                    <h3 className="text-xl font-bold font-mono">FINAL RANKING (최종 순위)</h3>
                </div>
                <div className="overflow-y-auto max-h-[500px]">
                    <table className="w-full">
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {sortedTeams.map((team, index) => (
                            <tr key={team.id} className="hover:bg-blue-50 dark:hover:bg-slate-800/50 transition">
                            <td className="py-4 px-6">
                                <span className={`
                                inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold
                                ${index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
                                    index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300' :
                                    index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' : 'text-gray-400'}
                                `}>
                                {index + 1}
                                </span>
                            </td>
                            <td className="py-4 px-2 font-semibold text-gray-900 dark:text-gray-200">{team.name}</td>
                            <td className={`py-4 px-6 text-right font-bold text-lg font-mono ${team.totalScore >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
                                {team.totalScore}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 h-[500px] flex flex-col">
                <h3 className="text-xl font-bold font-mono mb-6 text-gray-700 dark:text-gray-300">ASSET GROWTH ANALYSIS (자산 성장 분석)</h3>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                        <defs>
                            {teams.map((t, i) => (
                            <linearGradient key={t.id} id={`color${t.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0}/>
                            </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                        <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 12}} />
                        <YAxis stroke="#9ca3af" tick={{fontSize: 12}} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                color: '#fff',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                            }}
                        />
                        {teams.map((t, i) => (
                            <Area
                            key={t.id}
                            type="monotone"
                            dataKey={t.name}
                            stroke={colors[i % colors.length]}
                            fillOpacity={1}
                            fill={`url(#color${t.id})`}
                            strokeWidth={3}
                            />
                        ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* AI Analysis Section */}
        {analysis && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-purple-500/20 overflow-hidden animate-in slide-in-from-bottom duration-500">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-purple-50 dark:bg-purple-900/10 flex items-center gap-3">
                    <Sparkles className="text-purple-600 dark:text-purple-400" />
                    <h3 className="text-2xl font-black font-mono text-purple-900 dark:text-purple-100">GEMINI 3.0 STRATEGIC ANALYSIS</h3>
                </div>
                <div className="p-8 space-y-8">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                        <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-wide text-sm">Executive Summary (경영 요약)</h4>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {analysis.marketAnalysis.map((m, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700">
                                <h5 className="font-bold text-gray-900 dark:text-white mb-2">{m.phase}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{m.description}</p>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">Team Strategy Critique (팀별 전략 평가)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis.teamStrategies.map((t, i) => (
                                <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50">
                                    <div className="font-mono font-bold text-gray-500 mb-2">{t.teamName}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-3">{t.analysis}</div>
                                    {t.strength && (
                                      <div className="text-sm p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 mb-2">
                                        <span className="font-bold text-green-600 dark:text-green-400">👍 칭찬할 점: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{t.strength}</span>
                                      </div>
                                    )}
                                    {t.growthPoint && (
                                      <div className="text-sm p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30">
                                        <span className="font-bold text-blue-600 dark:text-blue-400">🚀 성장 포인트: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{t.growthPoint}</span>
                                      </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 mt-8 pt-8 border-t border-gray-100 dark:border-slate-800">
                         <div className="flex-1">
                            <h4 className="font-bold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide text-sm">Strategic MVP Team (전략 MVP)</h4>
                            <p className="text-xl font-bold text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">{analysis.mvpTeam}</p>
                         </div>
                         <div className="flex-[2]">
                            <h4 className="font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide text-sm">Final Conclusion (최종 결론)</h4>
                            <p className="text-gray-700 dark:text-gray-300 italic whitespace-pre-wrap">"{analysis.conclusion}"</p>
                         </div>
                    </div>

                    {analysis.debriefingQuestions && analysis.debriefingQuestions.length > 0 && (
                      <div className="mt-8 pt-8 border-t border-gray-100 dark:border-slate-800">
                        <h4 className="font-bold text-amber-500 dark:text-amber-400 mb-4 uppercase tracking-wide text-sm flex items-center gap-2">
                          💬 Debriefing Questions (팀 토의 질문)
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">게임 경험을 실무와 연결하여 팀원들과 함께 토의해 보세요.</p>
                        <div className="grid gap-3">
                          {analysis.debriefingQuestions.map((question, idx) => (
                            <div key={idx} className="flex items-start gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 font-bold text-sm flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{question}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
            </div>
        )}

      </div>

      <div id="control-buttons" className="flex flex-col md:flex-row justify-center items-center gap-4 py-8 max-w-7xl mx-auto print:hidden">
          <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`
                    px-8 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center gap-3 text-white
                    ${isAnalyzing ? 'bg-gray-400 cursor-wait' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'}
                `}
            >
                {isAnalyzing ? (
                    <>
                     <RefreshCw className="animate-spin" size={20} /> Analyzing Game Data...
                    </>
                ) : (
                    <>
                     <Sparkles size={20} /> GENERATE AI ANALYSIS
                    </>
                )}
            </button>

            <button
                onClick={handleDownloadHTML}
                className="bg-gray-800 dark:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-700 dark:hover:bg-slate-600 transition shadow-lg flex items-center gap-3"
            >
                <Download size={20} />
                DOWNLOAD REPORT HTML
            </button>

            <button
                onClick={onRestart}
                className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition shadow-lg border border-gray-200 dark:border-slate-700 flex items-center gap-3"
            >
                <RefreshCw size={20} />
                NEW SIMULATION
            </button>
      </div>
    </div>
  );
};
