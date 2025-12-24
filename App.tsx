
import React, { useState, useRef, useEffect } from 'react';
import { 
  Aperture, 
  Monitor, 
  Mic, 
  Zap, 
  Palette, 
  Download, 
  Upload, 
  Trash2, 
  Search, 
  Wand2, 
  Play, 
  Loader2, 
  AlertCircle,
  Sparkles,
  Command,
  PenTool,
  Copy,
  RefreshCw,
  Globe,
  Stars,
  Clock,
  Menu,
  X,
  Gauge,
  BrainCircuit,
  ChevronRight,
  LayoutTemplate
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Scene, AspectRatio, AppStatus } from './types';
import { VOICE_OPTIONS, ASPECT_RATIOS } from './constants';
import * as gemini from './services/geminiService';

const App: React.FC = () => {
  // --- STATE ---
  const [script, setScript] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Style Engine
  const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
  const [masterStylePrompt, setMasterStylePrompt] = useState('');
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [manualStyleInput, setManualStyleInput] = useState('');

  // Script Refinement
  const [refineInstructions, setRefineInstructions] = useState('');
  const [isRefiningScript, setIsRefiningScript] = useState(false);

  // Production Config
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isEnhancingAll, setIsEnhancingAll] = useState(false);

  // Thumbnail State
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
  const [thumbnailPrompt, setThumbnailPrompt] = useState('Create a highly engaging, viral-worthy thumbnail. Blend the most dramatic visuals from the production. Hyper-realistic, 8k, cinematic lighting.');
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, audioUrl]);

  // Desktop/Mobile sidebar logic
  useEffect(() => {
    const handleInitialState = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleInitialState();
    window.addEventListener('resize', handleInitialState);
    return () => window.removeEventListener('resize', handleInitialState);
  }, []);

  // --- HANDLERS ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingStyle(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const cleanBase64 = base64.replace(/^data:image\/(png|jpeg);base64,/, "");
      setStyleReferenceImage(base64);
      try {
        const extracted = await gemini.extractStyle(cleanBase64, file.type);
        setMasterStylePrompt(extracted);
      } catch (err) {
        setError("Could not extract style from image.");
      } finally {
        setIsAnalyzingStyle(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualStyleSearch = async () => {
    if (!manualStyleInput.trim()) return;
    setIsAnalyzingStyle(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Describe the visual aesthetic of "${manualStyleInput}" in 20 keywords covering lighting, medium, and colors.`
      });
      setMasterStylePrompt(res.text || "");
    } catch (err) {
      setError("Failed to fetch style descriptors.");
    } finally {
      setIsAnalyzingStyle(false);
    }
  };

  const handleDirectorRun = async () => {
    if (!script.trim()) return;
    setStatus(AppStatus.ANALYZING);
    setError(null);
    if (window.innerWidth < 1024) setSidebarOpen(false);
    try {
      const analyzedScenes = await gemini.analyzeScript(script, masterStylePrompt);
      setScenes(analyzedScenes.map(s => ({ ...s, isGeneratingImage: false, isEnhancingPrompt: false })));
      setStatus(AppStatus.PRODUCING);
    } catch (err) {
      setError("Production Analysis Failed.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleRefineScript = async () => {
    if (!script.trim() || !refineInstructions.trim()) return;
    setIsRefiningScript(true);
    setError(null);
    try {
      const updatedScript = await gemini.refineScript(script, refineInstructions);
      setScript(updatedScript);
      setRefineInstructions('');
    } catch (err) {
      setError("Script refinement failed.");
    } finally {
      setIsRefiningScript(false);
    }
  };

  const handleEnhancePrompt = async (sceneNumber: number) => {
    setScenes(prev => prev.map(s => s.scene_number === sceneNumber ? { ...s, isEnhancingPrompt: true } : s));
    try {
      const scene = scenes.find(s => s.scene_number === sceneNumber);
      if (!scene) return;
      const enhanced = await gemini.enhancePrompt(scene.prompt, masterStylePrompt);
      setScenes(prev => prev.map(s => s.scene_number === sceneNumber ? { ...s, prompt: enhanced, isEnhancingPrompt: false } : s));
    } catch (err) {
      setError("Prompt enhancement failed.");
      setScenes(prev => prev.map(s => s.scene_number === sceneNumber ? { ...s, isEnhancingPrompt: false } : s));
    }
  };

  const handleVisualize = async (sceneNumber: number) => {
    const scene = scenes.find(s => s.scene_number === sceneNumber);
    if (!scene) return;
    setScenes(prev => prev.map(s => s.scene_number === sceneNumber ? { ...s, isGeneratingImage: true } : s));
    try {
      const imageUrl = await gemini.generateImage(scene.prompt, aspectRatio);
      setScenes(prev => prev.map(s => s.scene_number === sceneNumber ? { ...s, generatedImage: imageUrl, isGeneratingImage: false } : s));
    } catch (err) {
      setScenes(prev => prev.map(s => s.scene_number === sceneNumber ? { ...s, isGeneratingImage: false, error: "Image failed" } : s));
    }
  };

  const handleGenerateFullAudio = async () => {
    if (!script) return;
    setIsGeneratingAudio(true);
    try {
      const url = await gemini.generateTTS(script, selectedVoice);
      setAudioUrl(url);
    } catch (err) {
      setError("TTS failed.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleEnhanceAll = async () => {
    if (scenes.length === 0) return;
    setIsEnhancingAll(true);
    try {
      const enhancedScenes = await Promise.all(scenes.map(async (scene) => {
        const enhanced = await gemini.enhancePrompt(scene.prompt, masterStylePrompt);
        return { ...scene, prompt: enhanced };
      }));
      setScenes(enhancedScenes);
    } catch (err) {
      setError("Bulk enhancement failed.");
    } finally {
      setIsEnhancingAll(false);
    }
  };

  const handleGenerateThumbnail = async () => {
    const validImages = scenes.filter(s => s.generatedImage).map(s => s.generatedImage!) as string[];
    if (validImages.length === 0) {
      setError("Generate at least one scene image first.");
      return;
    }
    setIsGeneratingThumbnail(true);
    setError(null);
    try {
      const thumbUrl = await gemini.generateThumbnail(validImages, thumbnailPrompt, aspectRatio);
      setThumbnailImage(thumbUrl);
    } catch (err) {
      setError("Thumbnail generation failed.");
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-600/40 selection:text-white bg-[#020202] text-slate-200 overflow-hidden">
      {/* Cinematic Ambient Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[120vw] h-[120vh] bg-indigo-600/5 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vh] bg-emerald-600/5 rounded-full blur-[140px]" />
      </div>

      {/* --- HEADER --- */}
      <header className="h-16 shrink-0 border-b border-white/5 bg-black/60 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 sticky top-0 z-[60]">
        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 lg:hidden active:scale-95 transition-transform"
            aria-label="Toggle Sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Aperture className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="hidden xsm:block text-left">
              <h1 className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-white">
                Vision<span className="text-indigo-400">Forge</span>
              </h1>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Production Engine</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={handleDirectorRun}
            disabled={!script || status === AppStatus.ANALYZING}
            className="group relative px-4 sm:px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2 overflow-hidden shadow-xl shadow-indigo-600/20 active:scale-95"
          >
            {status === AppStatus.ANALYZING ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 group-hover:scale-125 transition-transform" />
            )}
            <span className="hidden xsm:inline">Generate Production</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* --- SIDEBAR: Configuration --- */}
        <aside 
          className={`
            fixed lg:relative inset-y-0 left-0 z-50 w-72 sm:w-80 bg-black/80 lg:bg-transparent backdrop-blur-2xl lg:backdrop-blur-none border-r border-white/5 p-6 transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="h-full flex flex-col gap-8 overflow-y-auto no-scrollbar pb-10">
            {/* Style Engine Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Palette className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Visual DNA</h3>
              </div>
              
              <div className="space-y-3">
                <div className="group relative aspect-video bg-white/5 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden">
                  {styleReferenceImage ? (
                    <img src={styleReferenceImage} alt="Reference" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-500 group-hover:text-indigo-400" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Drop Reference Image</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    onChange={handleFileUpload} 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept="image/*"
                  />
                  {styleReferenceImage && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setStyleReferenceImage(null); setMasterStylePrompt(''); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-md hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    value={manualStyleInput}
                    onChange={(e) => setManualStyleInput(e.target.value)}
                    placeholder="Search style (e.g. Cyberpunk)"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all pr-10"
                  />
                  <button 
                    onClick={handleManualStyleSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {masterStylePrompt && (
                  <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-lg p-3">
                    <p className="text-[10px] leading-relaxed text-indigo-200/80 italic line-clamp-3 text-left">
                      "{masterStylePrompt}"
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Production Settings */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Gauge className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Global Config</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio as AspectRatio)}
                    className={`
                      py-2 px-1 rounded-lg border text-[10px] font-black transition-all
                      ${aspectRatio === ratio 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}
                    `}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Mic className="w-3 h-3" /> Selected Narrator
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {VOICE_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left
                        ${selectedVoice === v.id 
                          ? 'bg-indigo-600/20 border-indigo-600 text-indigo-400' 
                          : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:border-white/10'}
                      `}
                    >
                      <span className="text-lg">{v.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{v.name}</span>
                        <span className="text-[9px] opacity-50 uppercase tracking-tight">{v.gender}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {audioUrl && (
              <section className="mt-auto pt-6 border-t border-white/5">
                <div className="bg-indigo-600/20 rounded-2xl p-4 border border-indigo-500/30">
                  <audio ref={audioRef} src={audioUrl} controls className="w-full h-8 opacity-80" />
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Master Audio</span>
                    <a 
                      href={audioUrl} 
                      download="voiceover.wav"
                      className="p-1.5 hover:bg-white/10 rounded-md text-indigo-400 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </section>
            )}
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* SCRIPT EDITOR BAR */}
          <div className="bg-white/5 border-b border-white/5 p-4 sm:p-6 shrink-0">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="relative group">
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Enter your voiceover script here... (e.g. In a world where machines dream...)"
                  className="w-full h-32 sm:h-40 bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all resize-none shadow-inner"
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-medium text-slate-500">{script.length} characters</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={refineInstructions}
                    onChange={(e) => setRefineInstructions(e.target.value)}
                    placeholder="Refine script (e.g. make it more punchy)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none pr-20"
                  />
                  <button 
                    onClick={handleRefineScript}
                    disabled={isRefiningScript || !script || !refineInstructions}
                    className="absolute right-1 top-1 bottom-1 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-white transition-all"
                  >
                    {isRefiningScript ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refine'}
                  </button>
                </div>
                <button 
                  onClick={handleGenerateFullAudio}
                  disabled={isGeneratingAudio || !script}
                  className="px-6 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isGeneratingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Generate Voiceover
                </button>
              </div>
            </div>
          </div>

          {/* PRODUCTION CANVAS */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar">
            <div className="max-w-4xl mx-auto">
              {status === AppStatus.IDLE && (
                <div className="h-[40vh] flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center border border-indigo-500/20">
                    <Sparkles className="w-10 h-10 text-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Your Production Canvas</h2>
                    <p className="text-sm text-slate-500 max-w-sm">Enter a script and run the Director Engine to generate your scene-by-scene production map.</p>
                  </div>
                </div>
              )}

              {status === AppStatus.PRODUCING && (
                <div className="space-y-12 pb-24">
                  {/* Thumbnail Generator Section */}
                  <section className="bg-gradient-to-br from-indigo-900/20 to-emerald-900/10 border border-white/10 rounded-[2rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <LayoutTemplate className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col lg:flex-row gap-8">
                      <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                            <Monitor className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Master Frame Generator</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">High-Impact Viral Thumbnail</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <PenTool className="w-3 h-3" /> Thumbnail Strategy
                          </label>
                          <textarea
                            value={thumbnailPrompt}
                            onChange={(e) => setThumbnailPrompt(e.target.value)}
                            className="w-full h-24 bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500/40 outline-none resize-none transition-all"
                          />
                        </div>

                        <button 
                          onClick={handleGenerateThumbnail}
                          disabled={isGeneratingThumbnail || scenes.filter(s => s.generatedImage).length === 0}
                          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 rounded-2xl text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                          {isGeneratingThumbnail ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Sparkles className="w-5 h-5" />
                          )}
                          Synthesize Master Frame
                        </button>
                      </div>

                      <div className="w-full lg:w-80 space-y-4">
                        <div className={`
                          relative aspect-square bg-black/60 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center
                          ${aspectRatio === '16:9' ? 'aspect-video w-full' : 'aspect-square'}
                        `}>
                          {thumbnailImage ? (
                            <img src={thumbnailImage} alt="Thumbnail" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-3 opacity-20">
                              <LayoutTemplate className="w-12 h-12 text-slate-400" />
                              <span className="text-[9px] font-black uppercase">Asset Ready</span>
                            </div>
                          )}
                          {isGeneratingThumbnail && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
                              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                              <span className="text-[9px] font-black uppercase tracking-widest animate-pulse">Blending Visuals...</span>
                            </div>
                          )}
                        </div>
                        {thumbnailImage && (
                          <a 
                            href={thumbnailImage} 
                            download="MASTER_THUMBNAIL.png"
                            className="w-full py-3 bg-emerald-600/10 border border-emerald-500/30 hover:bg-emerald-600/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" /> Download 4K Master
                          </a>
                        )}
                      </div>
                    </div>
                  </section>

                  <div className="flex items-center justify-between sticky top-0 bg-[#020202]/80 backdrop-blur-md py-4 z-10 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-full">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{scenes.length} Scenes</span>
                      </div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-tighter">Storyboard Workflow</h2>
                    </div>
                    <button 
                      onClick={handleEnhanceAll}
                      disabled={isEnhancingAll}
                      className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all border border-white/10"
                    >
                      {isEnhancingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      Enhance All Prompts
                    </button>
                  </div>

                  {scenes.map((scene, idx) => (
                    <div 
                      key={scene.scene_number} 
                      className="group relative grid lg:grid-cols-[1fr_320px] gap-6 bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all"
                    >
                      <div className="space-y-6 text-left">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl font-black text-white/10 leading-none">0{scene.scene_number}</span>
                              <h3 className="text-lg font-bold text-white leading-tight">{scene.visual_hook}</h3>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                              <span className="flex items-center gap-1.5 text-indigo-400"><Clock className="w-3 h-3" /> {scene.duration_estimate}</span>
                              <span className="flex items-center gap-1.5"><Mic className="w-3 h-3" /> {scene.audio_mood}</span>
                            </div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase ${scene.viral_score > 80 ? 'bg-orange-500/10 border-orange-500/40 text-orange-400' : 'bg-slate-500/10 border-slate-500/40 text-slate-400'}`}>
                            Viral: {scene.viral_score}%
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <PenTool className="w-3 h-3" /> Production Prompt
                          </label>
                          <div className="relative group/prompt">
                            <textarea
                              value={scene.prompt}
                              onChange={(e) => {
                                const newPrompt = e.target.value;
                                setScenes(prev => prev.map(s => s.scene_number === scene.scene_number ? { ...s, prompt: newPrompt } : s));
                              }}
                              className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xs sm:text-sm text-slate-300 focus:ring-1 focus:ring-indigo-500/40 outline-none resize-none h-24 transition-all"
                            />
                            <button 
                              onClick={() => handleEnhancePrompt(scene.scene_number)}
                              disabled={scene.isEnhancingPrompt}
                              className="absolute top-3 right-3 p-2 bg-indigo-600/80 hover:bg-indigo-600 rounded-lg text-white shadow-lg transition-all opacity-0 group-hover/prompt:opacity-100 disabled:opacity-50"
                              title="Enhance with AI"
                            >
                              {scene.isEnhancingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                          <p className="text-xs text-slate-500 italic leading-relaxed">
                            <span className="text-indigo-400 font-bold uppercase mr-2 tracking-tighter not-italic">Strategy:</span>
                            {scene.rationale}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="relative aspect-square bg-black/40 rounded-2xl border border-white/5 overflow-hidden group/img">
                          {scene.generatedImage ? (
                            <>
                              <img src={scene.generatedImage} alt={`Scene ${idx}`} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-4">
                                <a 
                                  href={scene.generatedImage} 
                                  download={`scene-${scene.scene_number}.png`}
                                  className="w-full py-2 bg-white text-black text-[10px] font-black uppercase rounded-lg text-center flex items-center justify-center gap-2"
                                >
                                  <Download className="w-3 h-3" /> Download Asset
                                </a>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                              <Monitor className="w-8 h-8 text-white/5" />
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No Asset Generated</span>
                            </div>
                          )}
                          
                          {scene.isGeneratingImage && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                              <div className="relative">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                <div className="absolute inset-0 blur-xl bg-indigo-500/40 animate-pulse" />
                              </div>
                              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] animate-pulse">Rendering...</span>
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={() => handleVisualize(scene.scene_number)}
                          disabled={scene.isGeneratingImage}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Monitor className="w-4 h-4" />
                          {scene.generatedImage ? 'Regenerate Frame' : 'Generate Frame'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-4 text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">{error}</p>
                  <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Footer Branding */}
      <footer className="h-10 shrink-0 border-t border-white/5 bg-black/40 backdrop-blur-sm flex items-center justify-center px-8 z-50">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">
          Engine Core <span className="text-slate-800 px-2">|</span> v2.5.0 Deployment
        </p>
      </footer>
    </div>
  );
};

export default App;
