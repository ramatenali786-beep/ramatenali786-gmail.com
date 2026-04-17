/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Languages, 
  MessageSquare, 
  History, 
  Settings, 
  Mic,
  MicOff,
  Camera, 
  CameraOff,
  Send, 
  User, 
  LogOut, 
  Globe, 
  Video, 
  Phone,
  Search,
  ChevronRight,
  Sparkles,
  Volume2,
  Heart,
  Menu,
  Trash2,
  Play,
  Eye,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  ArrowRightLeft,
  PenLine,
  Square,
  X,
  Copy,
  BookOpen,
  BarChart3,
  FileText,
  Upload,
  BrainCircuit,
  Zap,
  Star,
  MessageSquarePlus,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from "@/lib/utils";
import { auth, db } from './firebase';
import { LANGUAGES } from './constants/languages';
import { LanguageSelector } from './constants/LanguageSelector';
import { RealTimeChat, CallInterface } from './components/PremiumFeatures';
import { PolicyPages } from './components/PolicyPages';
import { GlobalMap } from './components/GlobalMap';
import { SubscriptionScreen } from './components/SubscriptionScreen';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// --- Constants & Types ---
type TranslationHistory = {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: any;
  type: 'text' | 'voice' | 'ocr';
};

type CallRecord = {
  id: string;
  recipientName: string;
  type: 'voice' | 'video';
  duration: number;
  timestamp: any;
};

// --- AI Service ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Firestore Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorDetails = null;
      try {
        errorDetails = JSON.parse(this.state.error?.message || '');
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-bg-deep flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-surface border border-white/10 rounded-[2.5rem] p-10 space-y-6 shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-serif font-bold text-white">Something went wrong</h2>
              <p className="text-text-dim text-sm leading-relaxed">
                We encountered an unexpected error. Our team has been notified.
              </p>
            </div>
            {errorDetails && (
              <div className="bg-black/20 rounded-2xl p-4 text-left font-mono text-[10px] text-red-400/80 overflow-auto max-h-40 border border-red-500/10">
                <p className="font-bold uppercase tracking-wider mb-2 text-red-400">Error Context:</p>
                <pre>{JSON.stringify(errorDetails, null, 2)}</pre>
              </div>
            )}
            <Button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold h-14 rounded-2xl shadow-lg shadow-red-500/20"
            >
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [translatorSubTab, setTranslatorSubTab] = useState<'text' | 'chat' | 'camera' | 'document'>('text');
  const [isPremium, setIsPremium] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [unlockedPlans, setUnlockedPlans] = useState<string[]>([]);
  const [activeCall, setActiveCall] = useState<'voice' | 'video' | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<{ uid: string, displayName: string, photoURL: string } | null>(null);
  const [selectedChatRecipient, setSelectedChatRecipient] = useState<{ uid: string, displayName: string, photoURL: string } | null>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activePolicy, setActivePolicy] = useState('about');
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Learning Hub State
  const [wordOfTheDay, setWordOfTheDay] = useState<any>(null);
  const [isLearningLoading, setIsLearningLoading] = useState(false);
  const [quizSelection, setQuizSelection] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'incorrect' | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [previousWords, setPreviousWords] = useState<string[]>([]);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPreferredLanguage, setEditPreferredLanguage] = useState('en-GB');
  const [editDefaultSourceLang, setEditDefaultSourceLang] = useState('en-GB');
  const [editDefaultTargetLang, setEditDefaultTargetLang] = useState('ja-JP');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  
  // Translation State
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en-GB');
  const [targetLang, setTargetLang] = useState('ja-JP');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [ocrResult, setOcrResult] = useState('');
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [autoSpeakOcr, setAutoSpeakOcr] = useState(false);
  
  // History State
  const [history, setHistory] = useState<TranslationHistory[]>([]);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  
  // Feedback State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  // Favorites State (Mock for now, can be connected to Firebase later)
  const [favorites, setFavorites] = useState<TranslationHistory[]>([]);

  // Auto-stop camera on tab switch
  useEffect(() => {
    if (activeTab !== 'home' || translatorSubTab !== 'camera') {
      if (isCameraActive) {
        stopCamera();
      }
    }
  }, [activeTab, translatorSubTab]);
  
  // --- Auth Handlers ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            preferredLanguage: 'en-GB',
            defaultSourceLang: 'en-GB',
            defaultTargetLang: 'ja-JP',
            isPremium: false,
            unlockedPlans: [],
            createdAt: serverTimestamp()
          });
          // Store sensitive data separately
          await setDoc(doc(db, 'private_users', currentUser.uid), {
            email: currentUser.email,
            updatedAt: serverTimestamp()
          });
          setIsPremium(false);
          setUnlockedPlans([]);
        } else {
          const data = userSnap.data();
          setIsPremium(data.isPremium || false);
          setUnlockedPlans(data.unlockedPlans || []);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time User Profile
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserProfile(data);
        setIsPremium(data.isPremium || false);
        setUnlockedPlans(data.unlockedPlans || []);
        setEditDisplayName(data.displayName || '');
        setEditPreferredLanguage(data.preferredLanguage || 'en-GB');
        setEditDefaultSourceLang(data.defaultSourceLang || 'en-GB');
        setEditDefaultTargetLang(data.defaultTargetLang || 'ja-JP');
        // Initialize active session langs from defaults if not changed by user
        if (data.defaultSourceLang) setSourceLang(data.defaultSourceLang);
        if (data.defaultTargetLang) setTargetLang(data.defaultTargetLang);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    const userPath = `users/${user.uid}`;
    try {
      await setDoc(doc(db, userPath), {
        displayName: editDisplayName,
        preferredLanguage: editPreferredLanguage,
        defaultSourceLang: editDefaultSourceLang,
        defaultTargetLang: editDefaultTargetLang,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleFeature = async (feature: 'isVoiceCloningEnabled' | 'isSmartReplyEnabled') => {
    if (!user || !userProfile) return;
    const userPath = `users/${user.uid}`;
    const newValue = userProfile[feature] === undefined ? (feature === 'isSmartReplyEnabled' ? false : true) : !userProfile[feature];
    try {
      await setDoc(doc(db, userPath), {
        [feature]: newValue,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  };

  const generateAIProfilePic = async () => {
    if (!user) return;
    setIsGeneratingAvatar(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { text: `A professional and artistic avatar of a Global Scholar, futuristic communication theme, gold and deep blue colors, high detail, high quality.` }
          ]
        }
      });
      
      const imagePart = (response.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData);
      
      if (imagePart?.inlineData?.data) {
        const base64Data = imagePart.inlineData.data;
        const imageUrl = `data:image/png;base64,${base64Data}`;
        await setDoc(doc(db, 'users', user.uid), { photoURL: imageUrl }, { merge: true });
      }
    } catch (error) {
      console.error("AI Avatar Error:", error);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to clear your entire translation history?")) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'history'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      setHistory([]);
    } catch (error) {
      console.error("Clear history failed:", error);
    }
  };

  const handleRecallCall = (record: CallRecord) => {
    const contact = allUsers.find(u => u.displayName === record.recipientName);
    if (contact) {
      setSelectedRecipient(contact);
      setActiveCall(record.type);
    } else {
      // Mock recipient if not found in list (for demo consistency)
      setSelectedRecipient({ uid: 'mock-uid', displayName: record.recipientName, photoURL: '' });
      setActiveCall(record.type);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(u => u.uid !== auth.currentUser?.uid);
      setAllUsers(users);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab !== 'home' || translatorSubTab !== 'camera') {
      stopCamera();
    }
  }, [activeTab, translatorSubTab]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        uid: user?.uid || null,
        email: user?.email || null,
        content: feedbackText,
        rating: feedbackRating,
        timestamp: serverTimestamp()
      });
      setIsFeedbackModalOpen(false);
      setFeedbackText('');
      setFeedbackRating(5);
    } catch (error) {
      console.error("Feedback submission failed:", error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // --- Learning Hub Logic ---
  const fetchWordOfTheDay = async () => {
    setIsLearningLoading(true);
    setQuizSelection(null);
    setQuizResult(null);
    try {
      const targetLangName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a NEW and UNIQUE "Word of the Day" to help someone learn ${targetLangName}. 
        EXCLUDE these words: ${previousWords.join(', ')}.
        Return it as a JSON object with these fields: word, translation, pronunciation, exampleSentence, exampleTranslation, distractors (an array of 2 plausible but incorrect translations). 
        Only return the JSON.`,
      });
      const text = response.text || "{}";
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      // Update previous words list (keep last 20 to avoid bloat but ensure variety)
      setPreviousWords(prev => [parsed.word, ...prev].slice(0, 20));
      
      // Shuffle options for the quiz
      const options = [parsed.translation, ...(parsed.distractors || ["Something else", "I don't know"])].sort(() => Math.random() - 0.5);
      setWordOfTheDay({ ...parsed, options });
    } catch (e) {
      console.error("Learning hub error:", e);
    } finally {
      setIsLearningLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'learning') {
      fetchWordOfTheDay();
    }
  }, [activeTab, targetLang]);

  // --- Document Translation ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      setIsOcrLoading(true);
      setOcrResult('');

      try {
        const sourceLangName = LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang;
        const targetLangName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Translate this document from ${sourceLangName} to ${targetLangName}. Preserve the structure as much as possible.
                  Format your response as follows:
                  ORIGINAL: [Extracted text]
                  TRANSLATION: [Translated text]`
                },
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64Data
                  }
                }
              ]
            }
          ]
        });

        setOcrResult(response.text || 'No response from AI.');
      } catch (error) {
        console.error("Document translation failed:", error);
        setOcrResult("Failed to process document.");
      } finally {
        setIsOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpgrade = () => {
    setIsSubscriptionOpen(true);
  };

  const handlePurchase = async (plan: string, tier: 'monthly' | 'yearly') => {
    if (!user) return;
    const userPath = `users/${user.uid}`;
    try {
      const userRef = doc(db, userPath);
      const newUnlockedPlans = unlockedPlans.includes(plan) ? unlockedPlans : [...unlockedPlans, plan];
      const updateData: any = {
        unlockedPlans: newUnlockedPlans,
        updatedAt: serverTimestamp()
      };
      
      // If communication plan is purchased, unlock general premium features
      if (plan === 'comm') {
        updateData.isPremium = true;
      }

      await setDoc(userRef, updateData, { merge: true });
      setUnlockedPlans(newUnlockedPlans);
      if (plan === 'comm') setIsPremium(true);
      setIsSubscriptionOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  };

  // --- Language Detection ---
  useEffect(() => {
    const detectLanguage = async () => {
      if (!sourceText.trim() || sourceText.length < 5) return;
      
      setIsDetectingLanguage(true);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analyze the following text and identify its language. 
          Choose the most likely language from this list of supported languages: ${LANGUAGES.map(l => l.name).join(', ')}.
          Return ONLY the name of the language. If you are not confident, return "unknown".
          
          Text: ${sourceText.substring(0, 200)}`,
        });
        
        const detectedName = response.text?.trim().replace(/['"]/g, '');
        if (detectedName && detectedName.toLowerCase() !== 'unknown') {
          const matchedLang = LANGUAGES.find(l => 
            l.name.toLowerCase() === detectedName.toLowerCase() || 
            detectedName.toLowerCase().includes(l.name.toLowerCase())
          );
          if (matchedLang && matchedLang.code !== sourceLang) {
            setSourceLang(matchedLang.code);
          }
        }
      } catch (error) {
        console.error("Language detection failed:", error);
      } finally {
        setIsDetectingLanguage(false);
      }
    };

    const timer = setTimeout(() => {
      detectLanguage();
    }, 1200); // 1.2s debounce

    return () => clearTimeout(timer);
  }, [sourceText]);

  // --- Translation Logic ---
  const translateText = async (overrideText?: string) => {
    const textToTranslate = overrideText || sourceText;
    if (!textToTranslate.trim()) return;
    setIsTranslating(true);
    const sourceLangName = LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang;
    const targetLangName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text from ${sourceLangName} to ${targetLangName}. Only return the translation, nothing else.\n\nText: ${textToTranslate}`,
      });
      
      const result = response.text || '';
      setTranslatedText(result);

      if (user) {
        await addDoc(collection(db, 'history'), {
          uid: user.uid,
          sourceText: textToTranslate,
          translatedText: result,
          sourceLang,
          targetLang,
          type: overrideText ? 'voice' : 'text',
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = sourceLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let silenceTimer: any;
    let finalTranscript = '';

    recognition.onstart = () => {
      setIsRecording(true);
      setSourceText('');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const currentText = (finalTranscript + interimTranscript).trim();
      setSourceText(currentText);

      // Auto-trigger translation after 2 seconds of silence
      clearTimeout(silenceTimer);
      if (finalTranscript.trim()) {
        silenceTimer = setTimeout(() => {
          recognition.stop();
        }, 2000);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      clearTimeout(silenceTimer);
      if (finalTranscript.trim()) {
        translateText(finalTranscript.trim());
      } else if (sourceText.trim()) {
        translateText(sourceText.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      clearTimeout(silenceTimer);
    };

    recognition.start();
  };

  const playAudio = (text: string, lang: string) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  // --- OCR Logic ---
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError("Could not access camera. Please ensure you have granted permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureAndTranslate = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const base64Data = imageData.split(',')[1];

    setIsOcrLoading(true);
    setOcrResult('');

    try {
      const sourceLangName = LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang;
      const targetLangName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an expert OCR and translator. Extract all text from this image and translate it from ${sourceLangName} to ${targetLangName}. 
                Format your response as follows:
                ORIGINAL: [Extracted text in ${sourceLangName}]
                TRANSLATION: [Translated text in ${targetLangName}]
                
                If no text is found, simply say "No text detected."`
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ]
      });

      const result = response.text || 'No response from AI.';
      setOcrResult(result);

      const translationMatch = result.match(/TRANSLATION:\s*([\s\S]*)/i);
      const finalTranslation = translationMatch ? translationMatch[1].trim() : result;

      if (autoSpeakOcr && finalTranslation !== "No text detected.") {
        playAudio(finalTranslation, targetLang);
      }

      if (user && result !== "No text detected.") {
        // Extract translation part if possible for history
        const translationMatch = result.match(/TRANSLATION:\s*([\s\S]*)/i);
        const originalMatch = result.match(/ORIGINAL:\s*([\s\S]*?)(?=\nTRANSLATION:|$)/i);
        
        const finalTranslation = translationMatch ? translationMatch[1].trim() : result;
        const finalOriginal = originalMatch ? originalMatch[1].trim() : "Image Text";

        await addDoc(collection(db, 'history'), {
          uid: user.uid,
          sourceText: finalOriginal,
          translatedText: finalTranslation,
          sourceLang,
          targetLang,
          type: 'ocr',
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("OCR Translation failed:", error);
      setOcrResult("Failed to process image. Please try again.");
    } finally {
      setIsOcrLoading(false);
    }
  };

  // --- Real-time History ---
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'history'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TranslationHistory[];
      setHistory(items);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Real-time Call History ---
  useEffect(() => {
    if (!user) {
      setCallHistory([]);
      return;
    }

    const q = query(
      collection(db, 'calls'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CallRecord[];
      setCallHistory(items);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#050505] text-white">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-4"
        >
          <Globe className="w-12 h-12 text-blue-500" />
          <p className="text-sm font-medium tracking-widest uppercase">GlobalLingo</p>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-deep text-white font-sans overflow-x-hidden pb-24">
      {/* --- Header --- */}
      <header className="sticky top-0 z-[60] bg-bg-deep/80 backdrop-blur-xl px-6 pt-8 pb-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30 shadow-[0_0_20px_rgba(197,160,89,0.2)]">
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
              <Globe className="w-5 h-5 text-bg-deep" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-white">GlobalLingo</h1>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="w-12 h-12 rounded-full bg-surface border border-white/5 hover:bg-white/10 outline-none flex items-center justify-center transition-colors">
            <Menu className="w-6 h-6 text-gold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-bg-deep border-white/10 rounded-2xl p-2 shadow-2xl z-[70]">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-bold text-gold uppercase tracking-widest px-3 py-2">Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              
              {/* Contact Selection in Menu */}
              <div className="px-3 py-2">
                <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-2">Select Contact</p>
                <ScrollArea className="h-[200px] pr-1">
                  <div className="space-y-1">
                    {allUsers.length > 0 ? (
                      allUsers.map((u) => (
                        <DropdownMenuItem
                          key={u.uid}
                          onSelect={(e) => {
                            e.preventDefault();
                            setSelectedRecipient(u);
                          }}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-xl transition-all border text-left cursor-pointer",
                            selectedRecipient?.uid === u.uid 
                              ? "bg-gold/10 border-gold/30" 
                              : "bg-white/5 border-transparent hover:bg-white/10"
                          )}
                        >
                          <Avatar className="w-8 h-8 border border-white/10">
                            <AvatarImage src={u.photoURL} />
                            <AvatarFallback className="bg-gold/20 text-gold text-[10px] font-bold">
                              {u.displayName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{u.displayName || 'User'}</p>
                            {selectedRecipient?.uid === u.uid && <p className="text-[8px] text-gold font-bold uppercase">Selected</p>}
                          </div>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <p className="text-[10px] text-text-dim italic px-2 py-4 text-center">No contacts online</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-white/5" />
            
            <DropdownMenuGroup>
              <DropdownMenuItem 
                onSelect={() => {
                  if (!selectedRecipient && !selectedChatRecipient) {
                    setActiveTab('chat');
                    return;
                  }
                  setActiveCall('voice');
                }}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                  <Phone className="w-4 h-4 text-gold" />
                </div>
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-sm">Voice Call</span>
                  {(!selectedRecipient && !selectedChatRecipient) && <span className="text-[8px] text-red-400 font-bold uppercase tracking-tighter">Select contact first</span>}
                  {(selectedRecipient || selectedChatRecipient) && <span className="text-[8px] text-gold font-bold uppercase tracking-tighter">To {(selectedRecipient || selectedChatRecipient)?.displayName}</span>}
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onSelect={() => {
                  if (!selectedRecipient && !selectedChatRecipient) {
                    setActiveTab('chat');
                    return;
                  }
                  setActiveCall('video');
                }}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                  <Video className="w-4 h-4 text-gold" />
                </div>
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-sm">Video Call</span>
                  {(!selectedRecipient && !selectedChatRecipient) && <span className="text-[8px] text-red-400 font-bold uppercase tracking-tighter">Select contact first</span>}
                  {(selectedRecipient || selectedChatRecipient) && <span className="text-[8px] text-gold font-bold uppercase tracking-tighter">To {(selectedRecipient || selectedChatRecipient)?.displayName}</span>}
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuGroup>
              <DropdownMenuItem 
                onSelect={() => setActiveTab('profile')}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Settings className="w-4 h-4 text-text-dim" />
                </div>
                <span className="font-serif font-bold text-sm">Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="px-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Sub Tabs */}
              <div className="bg-surface/50 p-1.5 rounded-2xl border border-white/5 flex gap-2">
                {[
                  { id: 'text', icon: PenLine, label: 'Text' },
                  { id: 'chat', icon: MessageSquare, label: 'Chat' },
                  { id: 'camera', icon: Camera, label: 'Camera' },
                  { id: 'document', icon: FileText, label: 'Docs' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTranslatorSubTab(tab.id as 'text' | 'chat' | 'camera' | 'document')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 h-12 rounded-xl transition-all font-medium text-sm",
                      translatorSubTab === tab.id 
                        ? "bg-gold/10 text-gold border border-gold/30 shadow-inner" 
                        : "text-text-dim hover:text-white"
                    )}
                  >
                    <tab.icon className={cn("w-4 h-4", translatorSubTab === tab.id ? "text-gold" : "text-text-dim")} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sub Tabs Content */}
              <AnimatePresence mode="wait">
                {translatorSubTab === 'text' && (
                  <motion.div
                    key="text-tab"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                  >
                    {/* Language Selection */}
                    <div className="flex items-center gap-4">
                      <LanguageSelector 
                        label="From" 
                        selectedCode={sourceLang} 
                        onSelect={setSourceLang} 
                      />
                      <button 
                        onClick={() => {
                          const temp = sourceLang;
                          setSourceLang(targetLang);
                          setTargetLang(temp);
                        }}
                        className="w-12 h-12 rounded-full bg-surface border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:rotate-180 duration-500 shrink-0"
                      >
                        <ArrowRightLeft className="w-5 h-5 text-gold" />
                      </button>
                      <LanguageSelector 
                        label="To" 
                        selectedCode={targetLang} 
                        onSelect={setTargetLang} 
                      />
                    </div>

                    {/* Source Text Area */}
                    <div className="bg-surface p-6 rounded-3xl border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Source Text</p>
                          <AnimatePresence>
                            {isDetectingLanguage && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-1.5 px-2 py-0.5 bg-gold/10 rounded-full border border-gold/20"
                              >
                                <div className="w-1 h-1 rounded-full bg-gold animate-ping" />
                                <span className="text-[8px] font-bold text-gold uppercase tracking-tighter">AI Detecting Language...</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <AnimatePresence>
                          {isRecording && (
                            <motion.div 
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Listening...</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="relative min-h-[200px] bg-bg-deep/50 rounded-2xl border border-white/5 p-4">
                        <textarea
                          value={sourceText}
                          onChange={(e) => setSourceText(e.target.value)}
                          placeholder="Type or paste text here..."
                          className="w-full h-full bg-transparent resize-none focus:outline-none font-serif text-xl placeholder:text-text-dim/50"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleVoiceInput}
                            className={cn(
                              "w-12 h-12 rounded-full bg-bg-deep border border-white/5 transition-all duration-300",
                              isRecording ? "bg-red-500/20 border-red-500/50 animate-pulse" : "hover:bg-white/10"
                            )}
                          >
                            {isRecording ? (
                              <Square className="w-5 h-5 text-red-500 fill-red-500" />
                            ) : (
                              <Mic className="w-5 h-5 text-gold" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full bg-bg-deep border border-white/5 hover:bg-white/10">
                            <Camera className="w-5 h-5 text-gold" />
                          </Button>
                        </div>
                        <Button 
                          onClick={() => translateText()}
                          disabled={isTranslating || !sourceText}
                          className="bg-gold hover:bg-gold/90 text-bg-deep font-bold rounded-full px-8 h-12 shadow-lg shadow-gold/20 flex gap-2 items-center"
                        >
                          <Send className="w-4 h-4" />
                          Translate
                        </Button>
                      </div>
                    </div>

                    {/* Translation Result Area */}
                    <div className="bg-surface p-6 rounded-3xl border border-white/5 space-y-4">
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Translation</p>
                      <div className="min-h-[200px] flex flex-col items-center justify-center text-center space-y-4">
                        {translatedText ? (
                          <div className="w-full space-y-4">
                            <p className="font-serif text-xl leading-relaxed text-white text-left">{translatedText}</p>
                            <div className="flex justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => playAudio(translatedText, targetLang)}
                                className="w-10 h-10 rounded-full bg-bg-deep border border-white/5 hover:bg-white/10"
                              >
                                <Volume2 className="w-4 h-4 text-gold" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                              <Globe className="w-8 h-8 text-text-dim/30" />
                            </div>
                            <p className="text-text-dim text-sm font-medium">Translation will appear here</p>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {translatorSubTab === 'chat' && (
                  <motion.div
                    key="chat-tab"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                  >
                    {!isPremium ? (
                      <div className="bg-surface p-8 rounded-3xl border border-white/5 text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto border border-gold/20">
                          <MessageSquare className="w-10 h-10 text-gold" />
                        </div>
                        <h3 className="text-2xl font-serif font-bold">Real-time Chat</h3>
                        <p className="text-text-dim max-w-xs mx-auto">Connect with people globally with instant voice and text translation in your conversations.</p>
                        <div className="p-4 bg-gold/5 rounded-2xl border border-gold/20">
                           <p className="text-xs text-gold font-bold uppercase tracking-widest mb-2">Premium Feature</p>
                           <p className="text-sm text-text-dim mb-4">Upgrade to Premium to unlock real-time translated P2P chatting.</p>
                           <Button onClick={() => setActiveTab('profile')} className="bg-gold text-bg-deep font-bold rounded-full px-8 h-12">Upgrade Now</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Chat Recipient Selection */}
                        <div className="bg-surface p-4 rounded-3xl border border-white/5 space-y-4">
                          <div className="flex items-center justify-between px-2">
                            <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Select Chat Partner</p>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim" />
                              <Input 
                                value={chatSearch}
                                onChange={(e) => setChatSearch(e.target.value)}
                                placeholder="Search contacts..."
                                className="h-8 pl-8 text-[10px] bg-bg-deep border-white/5 rounded-full w-40 focus:border-gold/30 transition-all focus:w-48"
                              />
                            </div>
                          </div>
                          <ScrollArea className="w-full">
                            <div className="flex gap-3 pb-2">
                              {/* Global Chat Option */}
                              {!chatSearch && (
                                <button
                                  onClick={() => setSelectedChatRecipient(null)}
                                  className={cn(
                                    "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border min-w-[80px]",
                                    !selectedChatRecipient 
                                      ? "bg-gold/10 border-gold/30" 
                                      : "bg-bg-deep/50 border-white/5 hover:bg-white/5"
                                  )}
                                >
                                  <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
                                    <Globe className="w-6 h-6 text-gold" />
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-tighter">Global</span>
                                </button>
                              )}

                              {allUsers
                                .filter(u => u.displayName?.toLowerCase().includes(chatSearch.toLowerCase()))
                                .map((u) => (
                                <button
                                  key={u.uid}
                                  onClick={() => setSelectedChatRecipient(u)}
                                  className={cn(
                                    "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border min-w-[80px]",
                                    selectedChatRecipient?.uid === u.uid 
                                      ? "bg-gold/10 border-gold/30" 
                                      : "bg-bg-deep/50 border-white/5 hover:bg-white/5"
                                  )}
                                >
                                  <Avatar className="w-12 h-12 border border-white/10">
                                    <AvatarImage src={u.photoURL} />
                                    <AvatarFallback className="bg-gold/20 text-gold font-bold">
                                      {u.displayName?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] font-bold uppercase tracking-tighter truncate w-16 text-center">
                                    {u.displayName?.split(' ')[0] || 'User'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>

                        <RealTimeChat 
                          targetLang={targetLang} 
                          targetLangName={LANGUAGES.find(l => l.code === targetLang)?.name || targetLang} 
                          sourceLang={sourceLang}
                          sourceLangName={LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang}
                          recipientId={selectedChatRecipient?.uid}
                          recipientName={selectedChatRecipient?.displayName}
                          isSmartReplyEnabled={userProfile?.isSmartReplyEnabled}
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {translatorSubTab === 'camera' && (
                  <motion.div
                    key="camera-tab"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                  >
                    <div className="bg-surface rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
                      {!isCameraActive ? (
                        <div className="p-12 text-center space-y-6">
                          <div className="w-24 h-24 rounded-full bg-gold/10 flex items-center justify-center mx-auto border border-gold/20 shadow-[0_0_30px_rgba(197,160,89,0.1)]">
                            <Camera className="w-12 h-12 text-gold" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-serif font-bold">Visual Translation</h3>
                            <p className="text-text-dim max-w-xs mx-auto text-sm leading-relaxed">
                              Point your camera at signs, menus, or documents to see instant translations.
                            </p>
                          </div>
                          <Button 
                            onClick={startCamera}
                            className="bg-gold hover:bg-gold/90 text-bg-deep font-bold rounded-2xl h-16 px-12 shadow-lg shadow-gold/20 text-lg"
                          >
                            Start Camera
                          </Button>
                          {cameraError && (
                            <p className="text-red-400 text-xs font-bold uppercase tracking-wider">{cameraError}</p>
                          )}
                        </div>
                      ) : (
                        <div className="relative aspect-[3/4] bg-black">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                          />
                          <canvas ref={canvasRef} className="hidden" />
                          
                          {/* Camera Overlays */}
                          <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                            <div className="w-full h-full border-2 border-gold/50 rounded-2xl relative">
                              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-gold -ml-1 -mt-1" />
                              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-gold -mr-1 -mt-1" />
                              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-gold -ml-1 -mb-1" />
                              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-gold -mr-1 -mb-1" />
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6 px-8">
                            <div className="flex flex-col items-center gap-2">
                              <Button 
                                onClick={stopCamera}
                                variant="ghost"
                                className="w-14 h-14 rounded-full bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 text-red-500 transition-all"
                              >
                                <CameraOff className="w-6 h-6" />
                              </Button>
                              <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Stop Camera</span>
                            </div>
                            
                            <div className="flex flex-col items-center gap-2">
                              <Button 
                                onClick={captureAndTranslate}
                                disabled={isOcrLoading}
                                className="w-20 h-20 rounded-full bg-gold text-bg-deep shadow-2xl shadow-gold/40 flex items-center justify-center group active:scale-95 transition-all"
                              >
                                {isOcrLoading ? (
                                  <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  >
                                    <Sparkles className="w-8 h-8" />
                                  </motion.div>
                                ) : (
                                  <div className="w-16 h-16 rounded-full border-4 border-bg-deep/20 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-bg-deep/10" />
                                  </div>
                                )}
                              </Button>
                              <span className="text-[9px] font-black uppercase tracking-widest text-gold">Capture</span>
                            </div>

                            <div className="w-14 h-14" /> {/* Spacer */}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* OCR Results */}
                    <AnimatePresence>
                      {ocrResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="bg-surface p-6 rounded-3xl border border-gold/30 shadow-[0_0_30px_rgba(197,160,89,0.1)] space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-gold" />
                              <p className="text-[10px] font-bold text-gold uppercase tracking-widest">AI Vision Result</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => setAutoSpeakOcr(!autoSpeakOcr)}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[10px] font-bold uppercase tracking-wider",
                                  autoSpeakOcr ? "bg-gold/20 border-gold text-gold" : "bg-white/5 border-white/10 text-text-dim"
                                )}
                              >
                                {autoSpeakOcr ? <Volume2 className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                                Auto-Speak
                              </button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 rounded-full"
                                onClick={() => setOcrResult('')}
                              >
                                <X className="w-4 h-4 text-text-dim" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-white/90">
                              {ocrResult.split('\n').map((line, i) => {
                                if (line.startsWith('ORIGINAL:')) {
                                  return <p key={i} className="text-sm text-text-dim mb-2">{line}</p>;
                                }
                                if (line.startsWith('TRANSLATION:')) {
                                  return <p key={i} className="text-xl font-bold text-gold">{line.replace('TRANSLATION:', '')}</p>;
                                }
                                return <p key={i}>{line}</p>;
                              })}
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                              <Button 
                                onClick={() => {
                                  const translation = ocrResult.match(/TRANSLATION:\s*([\s\S]*)/i)?.[1] || ocrResult;
                                  playAudio(translation, targetLang);
                                }}
                                className="bg-gold/10 text-gold border-gold/20 rounded-xl flex-1 h-12 font-bold"
                              >
                                <Volume2 className="w-4 h-4 mr-2" />
                                Speak
                              </Button>
                              <Button 
                                onClick={() => {
                                  const translation = ocrResult.match(/TRANSLATION:\s*([\s\S]*)/i)?.[1] || ocrResult;
                                  navigator.clipboard.writeText(translation);
                                }}
                                variant="ghost"
                                className="bg-white/5 text-white border border-white/10 rounded-xl flex-1 h-12 font-bold"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {translatorSubTab === 'document' && (
                  <motion.div
                    key="document-tab"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                  >
                    <div className="bg-surface p-12 rounded-3xl border border-white/5 text-center space-y-6">
                      <div className="w-24 h-24 rounded-full bg-gold/10 flex items-center justify-center mx-auto border border-gold/20 shadow-[0_0_30px_rgba(197,160,89,0.1)]">
                        <FileText className="w-12 h-12 text-gold" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-serif font-bold">Document Translation</h3>
                        <p className="text-text-dim max-w-xs mx-auto text-sm leading-relaxed">
                          Upload images or PDFs to translate entire documents while preserving context.
                        </p>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isOcrLoading}
                        className="bg-gold hover:bg-gold/90 text-bg-deep font-bold rounded-2xl h-16 px-12 shadow-lg shadow-gold/20 text-lg"
                      >
                        {isOcrLoading ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                            <Sparkles className="w-6 h-6" />
                          </motion.div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mr-2" />
                            Upload Document
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Reuse OCR Results UI */}
                    <AnimatePresence>
                      {ocrResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="bg-surface p-6 rounded-3xl border border-gold/30 shadow-[0_0_30px_rgba(197,160,89,0.1)] space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-gold" />
                              <p className="text-[10px] font-bold text-gold uppercase tracking-widest">Document Result</p>
                            </div>
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={() => setOcrResult('')}>
                              <X className="w-4 h-4 text-text-dim" />
                            </Button>
                          </div>
                          <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-white/90">
                            {ocrResult}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {isPremium ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">P2P Communication</p>
                      <h2 className="text-3xl font-serif font-bold">Real-Time Chat</h2>
                    </div>
                    
                    {selectedChatRecipient && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => setActiveCall('voice')}
                          className="bg-white/5 border border-white/10 hover:bg-gold hover:text-bg-deep rounded-2xl h-12 px-6 font-bold"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                        <Button 
                          onClick={() => setActiveCall('video')}
                          className="bg-gold text-bg-deep hover:bg-gold/90 rounded-2xl h-12 px-6 font-bold shadow-lg shadow-gold/20"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Video
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contacts List */}
                    <div className="bg-surface rounded-3xl border border-white/5 p-6 space-y-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                        <Input 
                          placeholder="Search contacts..." 
                          className="bg-bg-deep border-white/5 pl-10 rounded-xl h-12"
                          value={chatSearch}
                          onChange={(e) => setChatSearch(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        {allUsers
                          .filter(u => u.displayName?.toLowerCase().includes(chatSearch.toLowerCase()))
                          .map((u) => (
                          <button
                            key={u.uid}
                            onClick={() => setSelectedChatRecipient(u)}
                            className={cn(
                              "w-full p-4 rounded-2xl flex items-center gap-4 transition-all border",
                              selectedChatRecipient?.uid === u.uid 
                                ? "bg-gold/10 border-gold/30" 
                                : "bg-white/5 border-transparent hover:border-white/10"
                            )}
                          >
                            <Avatar className="w-12 h-12 border-2 border-gold/20">
                              <AvatarImage src={u.photoURL} />
                              <AvatarFallback className="bg-bg-deep text-gold">{u.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="text-left flex-1">
                              <p className="font-bold text-white">{u.displayName || 'GlobalLingo User'}</p>
                              <p className="text-[10px] text-text-dim uppercase tracking-widest">Online</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChatRecipient(u);
                                  setActiveCall('voice');
                                }}
                                className="w-8 h-8 rounded-full hover:bg-gold/20 hover:text-gold"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChatRecipient(u);
                                  setActiveCall('video');
                                }}
                                className="w-8 h-8 rounded-full hover:bg-gold/20 hover:text-gold"
                              >
                                <Video className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat Interface */}
                    <div className="lg:col-span-2">
                      <RealTimeChat 
                        targetLang={targetLang} 
                        targetLangName={LANGUAGES.find(l => l.code === targetLang)?.name || targetLang} 
                        sourceLang={sourceLang}
                        sourceLangName={LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang}
                        recipientId={selectedChatRecipient?.uid}
                        recipientName={selectedChatRecipient?.displayName}
                        isSmartReplyEnabled={userProfile?.isSmartReplyEnabled}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-surface p-12 rounded-[3.5rem] border border-gold/30 shadow-2xl relative overflow-hidden group max-w-2xl mx-auto flex flex-col items-center text-center space-y-8">
                  <div className="absolute top-0 right-0 p-8 opacity-10 blur-2xl group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-64 h-64 text-gold" />
                  </div>
                  <div className="w-24 h-24 rounded-[2rem] bg-gold/10 flex items-center justify-center border border-gold/20 shadow-inner relative z-10">
                    <MessageSquare className="w-12 h-12 text-gold fill-gold" />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <Badge className="bg-gold text-bg-deep font-black px-4 py-1">GLOBAL COMM</Badge>
                    <h3 className="text-4xl font-serif font-bold text-white">Unlock Real-Time Chat</h3>
                    <p className="text-text-dim max-w-sm mx-auto leading-relaxed">
                      Connect instantly with anyone, anywhere. Unlimited P2P chat with neural translation and smart contextual replies.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsSubscriptionOpen(true)}
                    className="bg-gold hover:bg-gold/90 text-bg-deep font-black h-16 px-12 rounded-2xl shadow-xl shadow-gold/20 text-lg transition-all hover:scale-105 relative z-10"
                  >
                    Unlock for $10/Month
                  </Button>
                  <p className="text-[9px] font-bold text-text-dim/40 uppercase tracking-[0.3em] relative z-10">Cancel Anytime • End-to-End Encryption</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'learning' && (
            <motion.div
              key="learning"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Learning Hub</p>
                  <h2 className="text-3xl font-serif font-bold">Master {LANGUAGES.find(l => l.code === targetLang)?.name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-48">
                    <LanguageSelector 
                      selectedCode={targetLang}
                      onSelect={(code) => setTargetLang(code)}
                      label="I am learning..."
                    />
                  </div>
                  <Button onClick={fetchWordOfTheDay} variant="ghost" className="text-gold h-14 px-6 rounded-2xl bg-white/5 border border-white/10">
                    <Zap className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              {unlockedPlans.includes('learning') ? (
              isLearningLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4 bg-surface rounded-3xl border border-white/5">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <BrainCircuit className="w-12 h-12 text-gold/50" />
                  </motion.div>
                  <p className="text-text-dim animate-pulse uppercase tracking-widest text-[10px] font-bold">AI is curating your lesson...</p>
                </div>
              ) : wordOfTheDay && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-surface border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <CardHeader className="bg-gold/10 border-b border-gold/20 p-6">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-gold text-bg-deep font-bold">Word of the Day</Badge>
                        <Volume2 
                          className="w-5 h-5 text-gold cursor-pointer hover:scale-110 transition-transform" 
                          onClick={() => playAudio(wordOfTheDay.word, targetLang)}
                        />
                      </div>
                      <CardTitle className="text-5xl font-serif font-bold text-white pt-4">{wordOfTheDay.word}</CardTitle>
                      <CardDescription className="text-gold font-medium italic">{wordOfTheDay.pronunciation}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Translation</p>
                        <p className="text-2xl font-medium text-white">{wordOfTheDay.translation}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Example Sentence</p>
                        <p className="text-lg text-white/80 italic">"{wordOfTheDay.exampleSentence}"</p>
                        <p className="text-sm text-text-dim">{wordOfTheDay.exampleTranslation}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <div className="bg-surface p-6 rounded-3xl border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif font-bold text-xl">Quick Quiz</h4>
                        {quizResult && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                              quizResult === 'correct' ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                            )}
                          >
                            {quizResult === 'correct' ? 'Perfect!' : 'Not quite!'}
                          </motion.div>
                        )}
                      </div>
                      <p className="text-sm text-text-dim">What does <span className="text-gold font-bold">"{wordOfTheDay.word}"</span> mean?</p>
                      <div className="grid grid-cols-1 gap-2">
                        {(wordOfTheDay.options || []).map((opt: string, i: number) => (
                          <Button 
                            key={i} 
                            variant="ghost" 
                            disabled={quizResult !== null}
                            onClick={() => {
                              setQuizSelection(opt);
                              const isCorrect = opt === wordOfTheDay.translation;
                              setQuizResult(isCorrect ? 'correct' : 'incorrect');
                              if (isCorrect) setQuizScore(prev => prev + 1);
                              setQuizTotal(prev => prev + 1);
                            }}
                            className={cn(
                              "justify-start bg-white/5 border border-white/10 rounded-xl h-12 transition-all",
                              quizSelection === opt && quizResult === 'correct' && "bg-green-500/20 border-green-500/50 text-green-400",
                              quizSelection === opt && quizResult === 'incorrect' && "bg-red-500/20 border-red-500/50 text-red-400",
                              quizResult && opt === wordOfTheDay.translation && "bg-green-500/10 border-green-500/30 text-green-400",
                              !quizResult && "hover:bg-gold hover:text-bg-deep hover:border-gold"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{opt}</span>
                              {quizSelection === opt && (
                                quizResult === 'correct' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                      {quizResult === 'incorrect' && (
                        <p className="text-[10px] text-text-dim italic text-center animate-in fade-in slide-in-from-bottom-1 duration-500">
                          The correct answer was <span className="text-gold font-bold">"{wordOfTheDay.translation}"</span>
                        </p>
                      )}

                      {quizResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Button 
                            onClick={fetchWordOfTheDay}
                            className="w-full bg-gold text-bg-deep hover:bg-gold/90 h-12 rounded-xl font-bold shadow-lg shadow-gold/20"
                          >
                            Next Question
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </motion.div>
                      )}
                      
                      <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-text-dim uppercase tracking-widest">
                        <span>Session Progress</span>
                        <span className="text-gold">{quizScore} / {quizTotal} Correct</span>
                      </div>
                    </div>
                    
                    <div className="bg-gold/5 p-6 rounded-3xl border border-gold/20 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-bg-deep" />
                      </div>
                      <div>
                        <p className="font-bold text-white">Daily Streak: 5 Days</p>
                        <p className="text-xs text-text-dim">Keep going to unlock Premium rewards!</p>
                      </div>
                    </div>
                  </div>
                </div>
               )) : (
                <div className="bg-surface p-12 rounded-[3.5rem] border border-blue-400/30 shadow-2xl relative overflow-hidden group max-w-2xl mx-auto flex flex-col items-center text-center space-y-8">
                  <div className="absolute top-0 right-0 p-8 opacity-10 blur-2xl group-hover:scale-110 transition-transform">
                    <BookOpen className="w-64 h-64 text-blue-400" />
                  </div>
                  <div className="w-24 h-24 rounded-[2rem] bg-blue-400/10 flex items-center justify-center border border-blue-400/20 shadow-inner relative z-10">
                    <Star className="w-12 h-12 text-blue-400 fill-blue-400" />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <Badge className="bg-blue-400 text-white font-black px-4 py-1">LINGO MASTERY</Badge>
                    <h3 className="text-4xl font-serif font-bold text-white">Unlock Infinite Learning</h3>
                    <p className="text-text-dim max-w-sm mx-auto leading-relaxed">
                      Master any language with neural-powered word cycles, pronunciation analysis, and cultural mastery paths.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsSubscriptionOpen(true)}
                    className="bg-blue-400 hover:bg-blue-500 text-white font-black h-16 px-12 rounded-2xl shadow-xl shadow-blue-400/20 text-lg transition-all hover:scale-105 relative z-10"
                  >
                    Unlock for $5/Month
                  </Button>
                  <p className="text-[9px] font-bold text-text-dim/40 uppercase tracking-[0.3em] relative z-10">Cancel Anytime • Secure Neural Processing</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'plans' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SubscriptionScreen isPage onPurchase={handlePurchase} />
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Network Insights</p>
                <h2 className="text-3xl font-serif font-bold">Your Global Impact</h2>
              </div>
              
              <GlobalMap />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Total Translations', value: history.length, icon: Globe },
                  { label: 'Languages Mastered', value: '12', icon: BookOpen },
                  { label: 'Global Reach', value: '84%', icon: BarChart3 },
                ].map((stat, i) => (
                  <div key={i} className="bg-surface p-6 rounded-3xl border border-white/5 space-y-2 shadow-xl">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                      <stat.icon className="w-5 h-5 text-gold" />
                    </div>
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">{stat.label}</p>
                    <p className="text-3xl font-serif font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Your Translations</p>
                  <h2 className="text-4xl font-serif font-bold mt-1">History</h2>
                  <p className="text-text-dim text-sm mt-1">Browse and manage your past translations</p>
                </div>
                <Button variant="ghost" onClick={handleClearHistory} className="text-red-400 hover:bg-red-400/10 rounded-full flex gap-2 border border-red-400/20">
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </div>

              {/* Stats */}
              <div className="bg-surface p-6 rounded-3xl border border-white/5 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-serif font-bold text-gold">{history.length}</p>
                  <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Total</p>
                </div>
                <div className="border-x border-white/5">
                  <p className="text-2xl font-serif font-bold text-gold">0</p>
                  <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Today</p>
                </div>
                <div>
                  <p className="text-2xl font-serif font-bold text-gold">4</p>
                  <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Languages</p>
                </div>
              </div>

              {/* History List */}
              <div className="space-y-6">
                {history.map((item) => (
                  <div key={item.id} className="bg-surface p-6 rounded-3xl border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-gold/10 text-gold border-gold/20 font-bold uppercase text-[10px]">{item.sourceLang}</Badge>
                        <ArrowRightLeft className="w-3 h-3 text-text-dim" />
                        <Badge className="bg-gold/10 text-gold border-gold/20 font-bold uppercase text-[10px]">{item.targetLang}</Badge>
                      </div>
                      <span className="text-[10px] font-bold text-text-dim uppercase">02/27/2026</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gold" />
                          <p className="text-[10px] font-bold text-gold uppercase tracking-wider">Original</p>
                        </div>
                        <p className="font-serif text-lg leading-relaxed">{item.sourceText}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Translated</p>
                        </div>
                        <p className="font-serif text-lg leading-relaxed text-blue-50">{item.translatedText}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => playAudio(item.translatedText, item.targetLang)}
                          className="w-10 h-10 rounded-full bg-bg-deep border border-white/5 hover:bg-white/10"
                        >
                          <Volume2 className="w-4 h-4 text-gold" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            const blob = new Blob([`Original: ${item.sourceText}\nTranslated: ${item.translatedText}`], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `translation-${item.id}.txt`;
                            a.click();
                          }}
                          className="w-10 h-10 rounded-full bg-bg-deep border border-white/5 hover:bg-white/10"
                        >
                          <FileText className="w-4 h-4 text-gold" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-bg-deep border border-white/5 hover:bg-white/10">
                          <Heart className="w-4 h-4 text-text-dim hover:text-red-400 transition-colors" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-bg-deep border border-white/5 hover:bg-red-400/10 text-text-dim hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">User Account</p>
                  <h2 className="text-4xl font-serif font-bold mt-1">Profile</h2>
                </div>
                <Button 
                  onClick={handleLogout}
                  variant="ghost" 
                  className="text-red-400 hover:bg-red-400/10 rounded-full flex gap-2 border border-red-400/20"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>

              {/* Profile Card */}
                    <div className="bg-surface p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8 relative overflow-hidden">
                {isGeneratingAvatar && (
                  <div className="absolute inset-0 bg-gold/5 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                      <Sparkles className="w-12 h-12 text-gold" />
                    </motion.div>
                    <p className="mt-4 text-gold font-bold uppercase tracking-widest text-[10px] animate-pulse">Gemini Generating Avatar...</p>
                  </div>
                )}
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative group">
                    <Avatar className="w-32 h-32 border-4 border-gold/20 shadow-[0_0_40px_rgba(197,160,89,0.2)]">
                      <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
                      <AvatarFallback className="bg-bg-deep text-gold text-4xl font-serif">{userProfile?.displayName?.[0] || user?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <button 
                      onClick={generateAIProfilePic}
                      className="absolute -bottom-2 -right-2 bg-gold text-bg-deep p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-center md:text-left space-y-2 flex-1">
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <h3 className="text-3xl font-serif font-bold">{userProfile?.displayName || user?.displayName || 'GlobalLingo User'}</h3>
                      {isPremium && <Badge className="bg-gold text-bg-deep font-bold animate-pulse">PREMIUM</Badge>}
                    </div>
                    <p className="text-text-dim">{user?.email}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-4">
                      <Badge variant="outline" className="border-gold/20 text-gold bg-gold/5 flex gap-2">
                        <Globe className="w-3 h-3" />
                        Preferred: {LANGUAGES.find(l => l.code === (userProfile?.preferredLanguage || 'en-GB'))?.name}
                      </Badge>
                      <Badge variant="outline" className="border-white/10 text-text-dim px-4">
                        Member since 2026
                      </Badge>
                    </div>
                  </div>

                  {!isEditingProfile ? (
                    <Button 
                      onClick={() => {
                        setEditDisplayName(userProfile?.displayName || user?.displayName || '');
                        setEditPreferredLanguage(userProfile?.preferredLanguage || 'en-GB');
                        setEditDefaultSourceLang(userProfile?.defaultSourceLang || 'en-GB');
                        setEditDefaultTargetLang(userProfile?.defaultTargetLang || 'ja-JP');
                        setIsEditingProfile(true);
                      }}
                      className="bg-gold/10 text-gold border-gold/20 hover:bg-gold hover:text-bg-deep rounded-2xl px-6 h-12 font-bold transition-all"
                    >
                      <PenLine className="w-4 h-4 mr-2" />
                      Manage Settings
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleUpdateProfile}
                        disabled={isSavingProfile}
                        className="bg-gold text-bg-deep font-bold rounded-2xl px-6 h-12 shadow-lg hover:scale-105 active:scale-95 transition-all"
                      >
                        {isSavingProfile ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button 
                        onClick={() => setIsEditingProfile(false)}
                        variant="ghost"
                        className="bg-white/5 text-white border border-white/10 rounded-2xl px-6 h-12"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {isEditingProfile && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-8 border-t border-white/5 space-y-8"
                  >
                    <div>
                      <h4 className="text-sm font-serif font-bold mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-gold" />
                        Account Basics
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gold uppercase tracking-[0.2em] px-1">Display Name</label>
                          <Input 
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            className="bg-bg-deep border-white/10 rounded-2xl h-14 focus:border-gold/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gold uppercase tracking-[0.2em] px-1">Preferred Language</label>
                          <LanguageSelector 
                            selectedCode={editPreferredLanguage}
                            onSelect={setEditPreferredLanguage}
                            label=""
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-serif font-bold mb-4 flex items-center gap-2">
                        <Languages className="w-4 h-4 text-gold" />
                        Translation Preferences
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gold uppercase tracking-[0.2em] px-1">Default Source Language</label>
                          <LanguageSelector 
                            selectedCode={editDefaultSourceLang}
                            onSelect={setEditDefaultSourceLang}
                            label=""
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gold uppercase tracking-[0.2em] px-1">Default Target Language</label>
                          <LanguageSelector 
                            selectedCode={editDefaultTargetLang}
                            onSelect={setEditDefaultTargetLang}
                            label=""
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <Tabs defaultValue="settings" className="w-full">
                  <TabsList className="bg-bg-deep/50 border border-white/5 p-1 rounded-2xl h-14 mb-8">
                    <TabsTrigger value="settings" className="flex-1 rounded-xl font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-gold data-[state=active]:text-bg-deep">
                      <Settings className="w-3 h-3 mr-2" />
                      Settings
                    </TabsTrigger>
                    <TabsTrigger value="calls" className="flex-1 rounded-xl font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-gold data-[state=active]:text-bg-deep">
                      <Phone className="w-3 h-3 mr-2" />
                      Call History
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="settings" className="space-y-8 mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-bg-deep/50 p-6 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <BrainCircuit className="w-5 h-5 text-gold" />
                            <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">AI Voice Cloning</p>
                          </div>
                          <button 
                            onClick={() => handleToggleFeature('isVoiceCloningEnabled')}
                            className={cn(
                              "w-12 h-6 rounded-full relative transition-all border",
                              userProfile?.isVoiceCloningEnabled ? "bg-gold border-gold" : "bg-white/10 border-white/20"
                            )}
                          >
                            <motion.div 
                              animate={{ x: userProfile?.isVoiceCloningEnabled ? 24 : 4 }}
                              className={cn(
                                "absolute top-1 w-4 h-4 rounded-full transition-colors",
                                userProfile?.isVoiceCloningEnabled ? "bg-bg-deep" : "bg-white"
                              )} 
                            />
                          </button>
                        </div>
                        <p className="text-xs text-text-dim leading-relaxed">
                          Use your own voice for neural translations during calls.
                        </p>
                      </div>

                      <div className="bg-bg-deep/50 p-6 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-gold" />
                            <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Smart Reply</p>
                          </div>
                          <button 
                            onClick={() => handleToggleFeature('isSmartReplyEnabled')}
                            className={cn(
                              "w-12 h-6 rounded-full relative transition-all border",
                              userProfile?.isSmartReplyEnabled !== false ? "bg-gold border-gold" : "bg-white/10 border-white/20"
                            )}
                          >
                            <motion.div 
                              animate={{ x: userProfile?.isSmartReplyEnabled !== false ? 24 : 4 }}
                              className={cn(
                                "absolute top-1 w-4 h-4 rounded-full transition-colors",
                                userProfile?.isSmartReplyEnabled !== false ? "bg-bg-deep" : "bg-white"
                              )} 
                            />
                          </button>
                        </div>
                        <p className="text-xs text-text-dim leading-relaxed">
                          Enable smart contextual replies in your target language.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-bg-deep/50 p-6 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Languages className="w-5 h-5 text-gold" />
                          <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Language Preferences</p>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between py-2 border-b border-white/5">
                            <span className="text-[10px] font-bold text-text-dim uppercase">Preferred Interface</span>
                            <span className="text-sm font-bold text-white">{LANGUAGES.find(l => l.code === userProfile?.preferredLanguage)?.name || 'Default'}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-white/5">
                            <span className="text-[10px] font-bold text-text-dim uppercase">Default Source</span>
                            <span className="text-sm font-bold text-white">{LANGUAGES.find(l => l.code === userProfile?.defaultSourceLang)?.name || 'Default'}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-white/5">
                            <span className="text-[10px] font-bold text-text-dim uppercase">Default Target</span>
                            <span className="text-sm font-bold text-white">{LANGUAGES.find(l => l.code === userProfile?.defaultTargetLang)?.name || 'Default'}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-text-dim/60 italic mt-2">Personalize your translation experience.</p>
                      </div>

                      <div className="bg-bg-deep/50 p-6 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3">
                          <Trash2 className="w-5 h-5 text-red-400" />
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em]">System & Data</p>
                        </div>
                        <div className="flex flex-col gap-3 py-2">
                           <Button 
                             onClick={handleClearHistory}
                             variant="outline"
                             className="border-red-400/20 hover:bg-red-400/10 text-red-400 h-10 text-[10px] font-bold rounded-xl justify-start gap-3 w-full uppercase tracking-widest"
                           >
                             <Trash2 className="w-4 h-4" />
                             Wipe Translation History
                           </Button>
                           <Button 
                             onClick={() => setActiveTab('history')}
                             variant="outline"
                             className="border-white/10 hover:bg-white/5 text-text-dim h-10 text-[10px] font-bold rounded-xl justify-start gap-3 w-full uppercase tracking-widest"
                           >
                             <History className="w-4 h-4" />
                             Review Full History
                           </Button>
                        </div>
                        <p className="text-[10px] text-text-dim/60 italic">Manage your stored data and usage logs.</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="calls" className="mt-0 focus-visible:outline-none">
                    <div className="space-y-4">
                      {callHistory.length > 0 ? (
                        callHistory.map((call) => (
                          <div key={call.id} className="bg-bg-deep/50 p-6 rounded-3xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center",
                                call.type === 'video' ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"
                              )}>
                                {call.type === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                              </div>
                              <div>
                                <h4 className="font-serif font-bold text-lg">{call.recipientName}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">
                                    {call.type === 'video' ? 'Video Call' : 'Voice Call'}
                                  </span>
                                  <div className="w-1 h-1 rounded-full bg-text-dim/30" />
                                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                                    {formatDuration(call.duration)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-text-dim uppercase mb-2">
                                {call.timestamp?.toDate() ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(call.timestamp.toDate()) : 'Recent'}
                              </p>
                              <Button 
                                onClick={() => handleRecallCall(call)}
                                variant="ghost" 
                                size="sm" 
                                className="h-8 rounded-full bg-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-gold hover:text-bg-deep transition-all"
                              >
                                Recall
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                          <div className="w-20 h-20 rounded-[2.5rem] bg-white/5 flex items-center justify-center border border-white/10">
                            <Phone className="w-10 h-10 text-white/20" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-xl font-serif font-bold text-white/60">No call history yet</h3>
                            <p className="text-sm text-text-dim/60">Your recent voice and video calls will appear here.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Premium Card */}
              {!isPremium && (
                <div className="bg-gradient-to-br from-gold/20 via-gold/5 to-transparent p-8 rounded-[2.5rem] border border-gold/30 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-32 h-32 text-gold" />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <div className="space-y-2">
                      <Badge className="bg-gold text-bg-deep font-bold">LIMITED OFFER</Badge>
                      <h3 className="text-3xl font-serif font-bold">Unlock the Full Experience</h3>
                      <p className="text-text-dim max-w-md">
                        Get unlimited real-time calls, document translation, and exclusive neural voice cloning features.
                      </p>
                    </div>
                    <Button 
                      onClick={handleUpgrade}
                      className="bg-gold hover:bg-gold/90 text-bg-deep font-bold rounded-2xl h-14 px-10 shadow-lg shadow-gold/20 text-lg transition-all hover:scale-105"
                    >
                      Upgrade to Premium
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Footer with Policies --- */}
      <footer className="mt-20 pb-32 border-t border-white/5 pt-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gold flex items-center justify-center shadow-[0_0_20px_rgba(197,160,89,0.3)]">
                <Languages className="w-6 h-6 text-bg-deep" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-white">GlobalLingo</h3>
            </div>
            <p className="text-text-dim text-sm max-w-xs">
              Breaking language barriers with the power of Generative AI. Secure, fast, and accurate translations for the modern world.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Legal</h4>
              <div className="flex flex-col gap-3">
                {[
                  { id: 'privacy', label: 'Privacy Policy' },
                  { id: 'return', label: 'Return Policy' },
                  { id: 'refund', label: 'Refund Policy' },
                  { id: 'disclaimer', label: 'Disclaimer' }
                ].map((p) => (
                  <button 
                    key={p.id}
                    onClick={() => {
                      setActivePolicy(p.id);
                      setActiveTab('policies');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-text-dim hover:text-gold text-sm text-left transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Support</h4>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setActivePolicy('about');
                    setActiveTab('policies');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-text-dim hover:text-gold text-sm text-left transition-colors"
                >
                  About & Contact
                </button>
                <p className="text-text-dim text-sm">Help Center</p>
                <button 
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="text-text-dim hover:text-gold text-sm text-left transition-colors"
                >
                  Send Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
            © 2026 GlobalLingo AI. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isFeedbackModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFeedbackModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-surface border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gold/20 flex items-center justify-center">
                    <MessageSquarePlus className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-white">Your Feedback</h3>
                </div>
                <p className="text-text-dim text-sm">Help us improve GlobalLingo for everyone.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gold uppercase tracking-widest px-1">How would you rate us?</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star className={cn(
                          "w-8 h-8",
                          feedbackRating >= star ? "text-gold fill-gold" : "text-white/10"
                        )} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gold uppercase tracking-widest px-1">Message</label>
                  <textarea 
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    className="w-full h-32 bg-bg-deep/50 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-gold/50 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback || !feedbackText.trim()}
                  className="flex-1 bg-gold text-bg-deep font-bold rounded-2xl h-14 shadow-lg shadow-gold/20"
                >
                  {isSubmittingFeedback ? 'Sending...' : 'Submit Feedback'}
                </Button>
                <Button 
                  onClick={() => setIsFeedbackModalOpen(false)}
                  variant="ghost"
                  className="flex-1 bg-white/5 text-white border border-white/10 rounded-2xl h-14 font-bold"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Bottom Navigation --- */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex items-center justify-between rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        {[
          { id: 'home', icon: Globe, label: 'Translate' },
          { id: 'chat', icon: MessageSquare, label: 'Chat' },
          { id: 'learning', icon: BookOpen, label: 'Learn' },
          { id: 'plans', icon: Crown, label: 'Plans' },
          { id: 'insights', icon: BarChart3, label: 'Insights' },
          { id: 'history', icon: History, label: 'History' },
          { id: 'profile', icon: User, label: 'Profile' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              activeTab === tab.id ? "bg-gold/10" : "group-hover:bg-zinc-100"
            )}>
              <tab.icon className={cn(
                "w-6 h-6 transition-all",
                activeTab === tab.id ? "text-gold fill-gold" : "text-zinc-400"
              )} />
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider transition-all",
              activeTab === tab.id ? "text-gold" : "text-zinc-400"
            )}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {activeCall && (
          <CallInterface 
            type={activeCall} 
            targetLang={targetLang} 
            targetLangName={LANGUAGES.find(l => l.code === targetLang)?.name || targetLang} 
            sourceLang={sourceLang}
            sourceLangName={LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang}
            recipientName={selectedRecipient?.displayName || selectedChatRecipient?.displayName || 'GlobalLingo User'}
            recipientPhoto={selectedRecipient?.photoURL || selectedChatRecipient?.photoURL}
            onClose={() => setActiveCall(null)} 
            isVoiceCloningEnabled={userProfile?.isVoiceCloningEnabled || false}
          />
        )}
      </AnimatePresence>

      <SubscriptionScreen 
        isOpen={isSubscriptionOpen} 
        onClose={() => setIsSubscriptionOpen(false)}
        onPurchase={handlePurchase}
      />
    </div>
  </ErrorBoundary>
  );
}
