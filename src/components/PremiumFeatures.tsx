import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Mic, 
  MicOff,
  Video, 
  VideoOff,
  Phone, 
  Volume2, 
  MessageSquare, 
  Camera,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  Globe,
  Zap,
  User,
  Signal,
  Wifi,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  originalText: string;
  translatedText: string;
  timestamp: any;
}

export function RealTimeChat({ 
  targetLang, 
  targetLangName, 
  sourceLang,
  sourceLangName,
  recipientId, 
  recipientName,
  isSmartReplyEnabled = true
}: { 
  targetLang: string, 
  targetLangName: string,
  sourceLang: string,
  sourceLangName: string,
  recipientId?: string,
  recipientName?: string,
  isSmartReplyEnabled?: boolean
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const user = auth.currentUser;

  const chatId = recipientId 
    ? [user?.uid, recipientId].sort().join('_') 
    : 'global';

  // Generate Smart Replies
  useEffect(() => {
    if (isSmartReplyEnabled && messages.length > 0 && messages[messages.length - 1].senderId !== user?.uid) {
      const generateReplies = async () => {
        try {
          const lastMsg = messages[messages.length - 1].translatedText;
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Based on the last message: "${lastMsg}", suggest 3 short, helpful, and natural replies in ${targetLangName}. 
            Only return the 3 replies separated by semicolons. No other text.`,
          });
          const replies = (response.text || "").split(';').map(r => r.trim()).filter(r => r);
          setSmartReplies(replies.slice(0, 3));
        } catch (e) {
          console.error("Smart reply error:", e);
        }
      };
      generateReplies();
    } else {
      setSmartReplies([]);
    }
  }, [messages, targetLangName, user?.uid, isSmartReplyEnabled]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [chatId, user]);

  const startVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = sourceLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Automatically send
      processAndSendMessage(transcript);
    };

    recognition.start();
  };

  const processAndSendMessage = async (text: string) => {
    if (!user || !text.trim() || isSending) return;
    setIsSending(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following ${sourceLangName} text to ${targetLangName}. Only return the translation.\n\nText: ${text}`,
      });
      const translated = response.text || text;

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        originalText: text,
        translatedText: translated,
        timestamp: serverTimestamp(),
        chatId: chatId
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input;
    setInput('');
    await processAndSendMessage(text);
  };

  const playMessageAudio = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-[500px] bg-surface rounded-3xl border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
            {recipientId ? <User className="w-5 h-5 text-gold" /> : <MessageSquare className="w-5 h-5 text-gold" />}
          </div>
          <div>
            <h4 className="font-serif font-bold">{recipientName ? `Chat with ${recipientName}` : 'Global Chat'}</h4>
            <p className="text-[10px] font-bold text-gold uppercase tracking-wider">Translating to {targetLangName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex flex-col max-w-[80%] group",
              msg.senderId === user?.uid ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <span className="text-[10px] font-bold text-text-dim mb-1 px-2">{msg.senderName}</span>
            <div className="flex items-center gap-2 group">
              {msg.senderId === user?.uid && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => playMessageAudio(msg.translatedText)}
                  className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 hover:bg-gold hover:text-bg-deep mx-1"
                >
                  <Volume2 className="w-3 h-3" />
                </Button>
              )}
              <div className={cn(
                "p-3 rounded-2xl space-y-1 shadow-lg flex-1",
                msg.senderId === user?.uid 
                  ? "bg-gold text-bg-deep rounded-tr-none" 
                  : "bg-bg-deep border border-white/5 rounded-tl-none"
              )}>
                <p className="text-xs opacity-70 italic line-through decoration-1">{msg.originalText}</p>
                <p className="font-medium text-sm">{msg.translatedText}</p>
              </div>
              {msg.senderId !== user?.uid && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => playMessageAudio(msg.translatedText)}
                  className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 hover:bg-gold mx-1"
                >
                  <Volume2 className="w-3 h-3 text-gold group-hover:text-bg-deep" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Smart Replies */}
      <AnimatePresence>
        {smartReplies.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-white/5 border-t border-white/5"
          >
            {smartReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => setInput(reply)}
                className="whitespace-nowrap px-4 py-1.5 rounded-full bg-surface border border-white/10 text-xs text-gold hover:bg-gold hover:text-bg-deep transition-all font-medium"
              >
                {reply}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSend} className="p-4 bg-bg-deep/50 border-t border-white/5 flex gap-2 items-center">
        <Button 
          type="button"
          onClick={startVoiceInput}
          variant="ghost"
          size="icon"
          className={cn(
            "w-10 h-10 rounded-xl transition-all",
            isListening ? "bg-gold text-bg-deep animate-pulse" : "bg-white/5 text-gold hover:bg-gold hover:text-bg-deep"
          )}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "Listening..." : `Type in ${sourceLangName}...`}
          className="flex-1 bg-surface border border-white/5 rounded-xl px-4 py-2 focus:outline-none focus:border-gold/50 text-sm"
        />
        <Button type="submit" disabled={!input.trim() || isSending} size="icon" className="bg-gold text-bg-deep rounded-xl w-10 h-10">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

export function CallInterface({ 
  type, 
  targetLang, 
  targetLangName, 
  sourceLang, 
  sourceLangName, 
  recipientName, 
  recipientPhoto, 
  onClose,
  isVoiceCloningEnabled = false
}: { 
  type: 'voice' | 'video', 
  targetLang: string, 
  targetLangName: string, 
  sourceLang: string,
  sourceLangName: string,
  recipientName: string,
  recipientPhoto?: string,
  onClose: () => void,
  isVoiceCloningEnabled?: boolean
}) {
  const [mode, setMode] = useState<'voice' | 'subtitles'>('subtitles');
  const [isCalling, setIsCalling] = useState(true);
  const [remoteSubtitles, setRemoteSubtitles] = useState<string[]>([]);
  const [mySubtitles, setMySubtitles] = useState<string[]>([]);
  const [interimMySubtitle, setInterimMySubtitle] = useState("");
  const [interimRemoteSubtitle, setInterimRemoteSubtitle] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranslatingSpeech, setIsTranslatingSpeech] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [signalStrength, setSignalStrength] = useState(4); // 1-4 bars
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedInterimRef = useRef<string>("");

  // --- Speech Recognition for User ---
  useEffect(() => {
    if (!isCalling || isMuted) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = sourceLang;
    recognition.continuous = true;
    recognition.interimResults = true;

    const performTranslation = async (text: string) => {
      if (!text.trim()) return;
      setIsTranslatingSpeech(true);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Translate the following text to ${targetLangName}. Only return the translation.\n\nText: ${text}`,
        });
        const translated = response.text || text;
        setMySubtitles(prev => [...prev.slice(-1), translated]);
        setInterimMySubtitle("");
        accumulatedInterimRef.current = "";
      } catch (e) {
        console.error("User speech translation error:", e);
      } finally {
        setIsTranslatingSpeech(false);
      }
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const finalTranscript = event.results[i][0].transcript;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          performTranslation(finalTranscript);
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      
      if (interim) {
        setInterimMySubtitle(interim);
        accumulatedInterimRef.current = interim;
        
        // Reset 2s silence timer
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (accumulatedInterimRef.current.trim()) {
            performTranslation(accumulatedInterimRef.current);
          }
        }, 2000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'no-speech') return;
      setIsMuted(true);
      setIsListening(false);
    };

    recognition.start();

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [isCalling, isMuted, sourceLang, targetLangName]);
  
  // Call Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    
    // Simulate signal fluctuations
    const signalTimer = setInterval(() => {
      const strengths = [3, 4, 4, 4, 2, 4]; // Mostly good, occasional drop
      setSignalStrength(strengths[Math.floor(Math.random() * strengths.length)]);
    }, 8000);

    // Simulate remote video toggle occasionally for demo
    const remoteVideoTimer = setInterval(() => {
      if (type === 'video') {
        setIsRemoteVideoOff(prev => !prev);
        // Turn it back on after 3 seconds
        setTimeout(() => setIsRemoteVideoOff(false), 3000);
      }
    }, 15000);

    return () => {
      clearInterval(timer);
      clearInterval(signalTimer);
      clearInterval(remoteVideoTimer);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Camera Access
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: type === 'video', 
          audio: true 
        });
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [type]);

  // Toggle Video Track
  useEffect(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOff;
      }
    }
  }, [isVideoOff]);

  // Toggle Audio Track
  useEffect(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
      }
    }
  }, [isMuted]);
  
  // Simulated incoming speech for demo
  useEffect(() => {
    // These represent what the OTHER person is saying in THEIR language (targetLang)
    const phrases = [
      "Hello, how are you today?",
      "I am very happy to talk with you using GlobalLingo.",
      "The translation is working perfectly in real-time.",
      "Would you like to see the subtitles or hear my voice?"
    ];
    
    let i = 0;
    const interval = setInterval(async () => {
      if (i >= phrases.length || !isCalling) {
        if (i >= phrases.length) clearInterval(interval);
        return;
      }
      
      const phrase = phrases[i];
      try {
        // 1. Simulate "Receiving Audio..." state
        setInterimRemoteSubtitle("...");
        
        // 2. Translate from the "other person's" language to the USER'S language
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Translate the following text to ${sourceLangName}. Only return the translation.\n\nText: ${phrase}`,
        });
        const translated = response.text || phrase;
        
        // 3. Simulate "Incremental Recognition" (Interim)
        const words = translated.split(' ');
        for (let j = 1; j <= words.length; j++) {
          await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing delay
          setInterimRemoteSubtitle(words.slice(0, j).join(' '));
        }

        // 4. Finalize
        setRemoteSubtitles(prev => [...prev.slice(-1), translated]);
        setInterimRemoteSubtitle("");
        
        if (mode === 'voice') {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(translated);
          utterance.lang = sourceLang;
          
          if (isVoiceCloningEnabled) {
            utterance.pitch = 1.1;
            utterance.rate = 1.0;
          } else {
            utterance.rate = 0.9;
          }
          
          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.error("Call translation error:", e);
        setInterimRemoteSubtitle("");
      }
      i++;
    }, 7000); // Increased interval to allow for interim simulation

    return () => {
      clearInterval(interval);
      window.speechSynthesis.cancel();
    };
  }, [mode, sourceLang, sourceLangName, isCalling]);

  const handleEndCall = async () => {
    try {
      if (auth.currentUser) {
        await addDoc(collection(db, 'calls'), {
          uid: auth.currentUser.uid,
          recipientName,
          type,
          duration: callDuration,
          timestamp: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Failed to save call record:", e);
    }
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#075E54] flex flex-col"
    >
      {/* WhatsApp Style Header */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/40 to-transparent z-20 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <p className="text-white/80 text-xs font-medium uppercase tracking-widest">End-to-End Encrypted</p>
          <div className="w-px h-3 bg-white/20 mx-1" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gold/10 rounded-full border border-gold/20">
            <Globe className="w-2.5 h-2.5 text-gold animate-spin-slow" />
            <span className="text-[8px] font-bold text-gold uppercase tracking-tighter">Secure Translation Active</span>
          </div>
          <div className="w-px h-3 bg-white/20 mx-1" />
          <div className="flex items-end gap-0.5 h-3 ml-1">
            {[1, 2, 3, 4].map((bar) => (
              <motion.div 
                key={bar}
                initial={false}
                animate={{ 
                  height: `${bar * 25}%`,
                  backgroundColor: bar <= signalStrength ? (
                    signalStrength === 4 ? "#4ade80" : 
                    signalStrength >= 2 ? "#facc15" : "#f87171"
                  ) : "rgba(255,255,255,0.1)"
                }}
                className={cn(
                  "w-1 rounded-full",
                  bar <= signalStrength && (
                    signalStrength === 4 ? "shadow-[0_0_8px_rgba(74,222,128,0.5)]" :
                    signalStrength >= 2 ? "shadow-[0_0_8px_rgba(250,204,21,0.5)]" :
                    "shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                  )
                )}
              />
            ))}
          </div>
          <span className={cn(
            "text-[8px] font-bold uppercase tracking-widest ml-1 transition-colors duration-500",
            signalStrength === 4 ? "text-green-400" : 
            signalStrength >= 2 ? "text-yellow-400" : "text-red-400"
          )}>
            {signalStrength === 4 ? 'Excellent' : 
             signalStrength === 3 ? 'Good' : 
             signalStrength === 2 ? 'Fair' : 'Poor'}
          </span>
          <div className="ml-1 flex items-center justify-center">
            {signalStrength > 1 ? (
              <Wifi className={cn(
                "w-3 h-3 transition-colors duration-500",
                signalStrength === 4 ? "text-green-400" : "text-yellow-400"
              )} />
            ) : (
              <WifiOff className="w-3 h-3 text-red-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* Translation Status Indicators */}
        <div className="flex items-center gap-6 my-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-500",
              (isTranslatingSpeech || interimMySubtitle) ? "bg-gold animate-pulse shadow-[0_0_10px_rgba(197,160,89,0.8)]" : "bg-white/10"
            )} />
            <span className={cn(
              "text-[7px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
              (isTranslatingSpeech || interimMySubtitle) ? "text-gold" : "text-white/20"
            )}>Sending</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-500",
              interimRemoteSubtitle ? "bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.8)]" : "bg-white/10"
            )} />
            <span className={cn(
              "text-[7px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
              interimRemoteSubtitle ? "text-blue-400" : "text-white/20"
            )}>Receiving</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-white text-2xl font-medium">{recipientName}</h3>
          {isSpeaking && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Volume2 className="w-4 h-4 text-green-400" />
            </motion.div>
          )}
        </div>
        <p className="text-white/70 text-sm font-medium">{formatDuration(callDuration)}</p>
        
        <div className="mt-4 bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
          <Globe className="w-3 h-3 text-gold" />
          <span className="text-[10px] font-bold text-gold uppercase tracking-wider">Translating to {sourceLangName}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {type === 'video' ? (
          <div className="w-full h-full relative bg-black">
            {/* Remote Video (Simulated) */}
            <img 
              src={recipientPhoto || "https://picsum.photos/seed/whatsapp/1280/720"} 
              alt="Remote User" 
              className={cn("w-full h-full object-cover transition-opacity duration-500", isRemoteVideoOff ? "opacity-20 grayscale" : "opacity-60")}
              referrerPolicy="no-referrer"
            />
            
            {isRemoteVideoOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 transition-all">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-4">
                  <VideoOff className="w-10 h-10 text-white/40" />
                </div>
                <p className="text-white/60 font-medium text-sm tracking-widest uppercase">{recipientName} has turned off video</p>
              </div>
            )}
            
            {/* Subtitles Overlay */}
            <div className="absolute bottom-40 left-0 right-0 px-8 flex flex-col items-center gap-4 z-30">
              <AnimatePresence>
                {remoteSubtitles.map((sub, idx) => (
                  <motion.div
                    key={`remote-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 text-white font-medium text-center max-w-[90%] shadow-2xl"
                  >
                    <p className="text-[10px] font-bold text-gold uppercase tracking-widest mb-1">{recipientName}</p>
                    {sub}
                  </motion.div>
                ))}
                {interimRemoteSubtitle && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white/70 italic text-sm text-center max-w-[80%]"
                  >
                    <div className="flex items-center gap-2 justify-center mb-1">
                      <div className="flex gap-0.5">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 rounded-full bg-blue-400" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 rounded-full bg-blue-400" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 rounded-full bg-blue-400" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-blue-400/60">
                        {recipientName} is speaking...
                      </span>
                    </div>
                    {interimRemoteSubtitle}
                  </motion.div>
                )}
                {mySubtitles.map((sub, idx) => (
                  <motion.div
                    key={`my-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gold/20 backdrop-blur-xl px-6 py-3 rounded-2xl border border-gold/30 text-gold font-medium text-center max-w-[90%] shadow-2xl"
                  >
                    <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">You (Sent as {targetLangName})</p>
                    {sub}
                  </motion.div>
                ))}
                {interimMySubtitle && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gold/10 backdrop-blur-md px-4 py-2 rounded-xl border border-gold/20 text-gold/70 italic text-sm text-center max-w-[80%] relative"
                  >
                    <div className="flex items-center gap-2 justify-center mb-1">
                      {isListening && (
                        <div className="flex gap-0.5">
                          <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-gold/40" />
                          <motion.div animate={{ height: [10, 4, 10] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-gold/40" />
                          <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-gold/40" />
                        </div>
                      )}
                      <span className="text-[8px] font-bold uppercase tracking-widest text-gold/40">
                        {isTranslatingSpeech ? "Translating..." : "Listening..."}
                      </span>
                    </div>
                    {interimMySubtitle}...
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Local Video (Self View) - Floating like WhatsApp */}
            <div className={cn(
              "absolute top-32 right-6 w-32 aspect-[3/4] rounded-2xl border-2 overflow-hidden shadow-2xl z-40 transition-all duration-500",
              interimMySubtitle || mySubtitles.length > 0 ? "border-gold ring-4 ring-gold/20 scale-105" : "border-white/20 bg-zinc-900"
            )}>
              <video 
                ref={localVideoRef}
                autoPlay 
                playsInline 
                muted 
                className={cn("w-full h-full object-cover scale-x-[-1]", isVideoOff && "hidden")}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                  <User className="w-10 h-10 text-white/20" />
                </div>
              )}
              
              {/* Transcription Overlay on Local Video */}
              <AnimatePresence>
                {(interimMySubtitle || mySubtitles.length > 0) && !isMuted && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gold/40 to-transparent p-2 pt-8"
                  >
                    <div className="flex items-center gap-1 justify-center">
                      <Zap className="w-2 h-2 text-white animate-pulse" />
                      <span className="text-[7px] font-black text-white uppercase tracking-tighter">Live Streamed</span>
                    </div>
                  </motion.div>
                )}
                {isMuted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex items-center justify-center"
                  >
                    <MicOff className="w-6 h-6 text-white/40" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-12">
            <div className="relative">
              <div className={cn(
                "w-48 h-48 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/20 relative transition-all duration-500",
                isSpeaking && "scale-110 border-gold/50"
              )}>
                {isSpeaking && <div className="absolute -inset-4 rounded-full border-2 border-gold/30 animate-ping" />}
                <div className="w-40 h-40 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {recipientPhoto ? (
                    <img src={recipientPhoto} alt={recipientName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-20 h-20 text-white/20" />
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-4 px-12">
              <div className="h-32 flex flex-col items-center justify-center gap-4">
                 <AnimatePresence mode="wait">
                  {remoteSubtitles.length > 0 && (
                    <motion.div 
                      key={remoteSubtitles[remoteSubtitles.length - 1]}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1"
                    >
                      <p className="text-[10px] font-bold text-gold uppercase tracking-widest">{recipientName}</p>
                      <p className="text-2xl font-medium text-white text-center leading-relaxed">
                        {remoteSubtitles[remoteSubtitles.length - 1]}
                      </p>
                    </motion.div>
                  )}
                  {interimRemoteSubtitle && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-white/40 italic text-sm"
                    >
                      {interimRemoteSubtitle}...
                    </motion.p>
                  )}
                  {mySubtitles.length > 0 && (
                    <motion.div 
                      key={mySubtitles[mySubtitles.length - 1]}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1"
                    >
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">You (Sent as {targetLangName})</p>
                      <p className="text-lg font-medium text-gold text-center leading-relaxed">
                        {mySubtitles[mySubtitles.length - 1]}
                      </p>
                    </motion.div>
                  )}
                  {interimMySubtitle && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5 h-3 items-center">
                          <motion.div animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 h-2 bg-gold/60 origin-center" />
                          <motion.div animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-0.5 h-3 bg-gold/60 origin-center" />
                          <motion.div animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-0.5 h-2 bg-gold/60 origin-center" />
                        </div>
                        <span className="text-[8px] font-bold text-gold/60 uppercase tracking-widest animate-pulse">
                          {isTranslatingSpeech ? "Translating..." : "Listening..."}
                        </span>
                      </div>
                      <p className="text-gold/40 italic text-sm">
                        {interimMySubtitle}...
                      </p>
                    </motion.div>
                  )}
                  {remoteSubtitles.length === 0 && mySubtitles.length === 0 && (
                    <p className="text-white/40 animate-pulse uppercase tracking-[0.3em] text-xs font-bold">Connecting Secure Translation...</p>
                  )}
                 </AnimatePresence>
              </div>
              {isSpeaking && (
                <div className="flex items-center justify-center gap-2 text-gold animate-pulse">
                  <Volume2 className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Neural Voice Active</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Style Controls Bar */}
      <div className="bg-[#121B22] p-8 pb-12 rounded-t-[3rem] border-t border-white/5 flex items-center justify-around z-50 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
        {/* Mute Control */}
        <div className="flex flex-col items-center gap-2">
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button 
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "w-16 h-16 rounded-full transition-all duration-500 flex items-center justify-center shadow-lg relative group",
                isMuted 
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/40" 
                  : "bg-white hover:bg-white/90 text-[#121B22] shadow-white/20"
              )}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isMuted ? 'muted' : 'unmuted'}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </motion.div>
              </AnimatePresence>
              {isMuted && (
                <div className="absolute top-0 right-0 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                </div>
              )}
            </Button>
          </motion.div>
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest transition-colors",
            isMuted ? "text-red-500" : "text-white"
          )}>
            {isMuted ? 'Muted' : 'Mic On'}
          </span>
        </div>

        {/* Video Control */}
        {type === 'video' && (
          <div className="flex flex-col items-center gap-2">
            <motion.div whileTap={{ scale: 0.9 }}>
              <button 
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={cn(
                  "w-16 h-16 rounded-full transition-all duration-500 flex items-center justify-center shadow-lg outline-none relative group",
                  isVideoOff 
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/40" 
                    : "bg-white hover:bg-white/90 text-[#121B22] shadow-white/20"
                )}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isVideoOff ? 'off' : 'on'}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                  >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </motion.div>
                </AnimatePresence>
                {isVideoOff && (
                  <div className="absolute top-0 right-0 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                )}
              </button>
            </motion.div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest transition-colors",
              isVideoOff ? "text-red-500" : "text-white"
            )}>
              {isVideoOff ? 'Camera Stopped' : 'Camera Active'}
            </span>
          </div>
        )}

        {/* Hang Up Control - Most Distinct */}
        <div className="flex flex-col items-center gap-2">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button 
              onClick={handleEndCall}
              className="w-20 h-20 rounded-[2.5rem] bg-red-600 hover:bg-red-700 text-white shadow-[0_15px_40px_rgba(220,38,38,0.5)] flex items-center justify-center transition-all group border-4 border-red-500/30 overflow-hidden relative"
            >
              <motion.div
                animate={{ rotate: [135, 145, 135] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="relative z-10"
              >
                <Phone className="w-9 h-9 rotate-[135deg] fill-white" />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </Button>
          </motion.div>
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">End Call</span>
        </div>

        {/* Mode & Signal Toggle Group */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex bg-white/5 rounded-full p-1 border border-white/10 shadow-sm backdrop-blur-sm">
            <button 
              onClick={() => setMode('subtitles')}
              className={cn(
                "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                mode === 'subtitles' ? "bg-gold text-bg-deep shadow-md" : "text-white/30 hover:text-white/60"
              )}
            >
              Subs
            </button>
            <button 
              onClick={() => setMode('voice')}
              className={cn(
                "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                mode === 'voice' ? "bg-gold text-bg-deep shadow-md" : "text-white/30 hover:text-white/60"
              )}
            >
              Voice
            </button>
          </div>
          
          {/* Signal Indicator integrated into controls for awareness */}
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 group relative overflow-hidden">
            {signalStrength < 2 && (
              <motion.div 
                animate={{ x: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute inset-y-0 w-8 bg-red-500/10 skew-x-12"
              />
            )}
            <div className="flex items-end gap-0.5 h-2">
              {[1, 2, 3, 4].map((bar) => (
                <motion.div 
                  key={bar}
                  animate={{ 
                    height: `${bar * 25}%`,
                    backgroundColor: bar <= signalStrength ? (
                      signalStrength === 4 ? "#4ade80" : 
                      signalStrength >= 2 ? "#facc15" : "#f87171"
                    ) : "rgba(255,255,255,0.1)"
                  }}
                  className="w-0.5 rounded-full"
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-[7px] font-bold uppercase tracking-tighter transition-colors duration-500",
                signalStrength === 4 ? "text-green-400" : 
                signalStrength >= 2 ? "text-yellow-400" : "text-red-400"
              )}>
                {signalStrength === 4 ? 'Maximum' : signalStrength >= 2 ? 'Stable' : 'Unstable'}
              </span>
              {signalStrength < 2 && <Signal className="w-2 h-2 text-red-500 animate-pulse" />}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
