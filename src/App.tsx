import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  limit,
  getDocFromServer,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  MessageSquare, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  X, 
  Reply, 
  Smile,
  Users,
  Terminal,
  Sun,
  Moon,
  Megaphone,
  Settings,
  ShieldAlert,
  History,
  Ban,
  MicOff,
  Mic,
  Plus,
  Coins,
  Menu,
  BarChart3,
  Hash,
  AtSign,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from './lib/utils';

// --- Types ---

interface Message {
  id: string;
  text: string;
  senderNickname: string;
  senderIp: string;
  timestamp: any;
  replyToId?: string;
  reactions?: Record<string, number>;
  imageUrl?: string;
  isHighlight?: boolean;
  type?: 'text' | 'poll';
  pollData?: {
    question: string;
    options: { text: string; votes: string[] }[];
    totalVotes: number;
    isClosed?: boolean;
  };
  mentions?: string[];
}

interface UserSession {
  id: string;
  nickname: string;
  ip: string;
  lastActive: any;
}

interface Log {
  id: string;
  type: string;
  content: string;
  timestamp: any;
  ip: string;
  nickname?: string;
}

interface Notice {
  text: string;
  updatedAt: any;
  author: string;
}

// --- Constants ---

const THEME_CONFIG = {
  dark: {
    bg: 'bg-[#121212]',
    card: 'bg-[#1e1e1e]',
    border: 'border-[#2a2a2a]',
    text: 'text-white',
    textMuted: 'text-gray-400',
    accent: 'bg-white text-black hover:bg-gray-200',
    input: 'bg-black/50 border-white/10 text-white focus:border-white/40',
    messageMe: 'bg-white text-black',
    messageOther: 'bg-[#252525] text-white border-white/5',
    sidebar: 'bg-[#1e1e1e] border-[#2a2a2a]',
    logItem: 'bg-black/20 border-white/10',
    ghost: 'bg-white/5 border-white/10',
    ghostHover: 'hover:bg-white/10',
    icon: 'text-white',
    iconMuted: 'text-white/50',
    subtle: 'text-white/20',
  },
  light: {
    bg: 'bg-[#f5f5f5]',
    card: 'bg-white',
    border: 'border-gray-200',
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    accent: 'bg-gray-900 text-white hover:bg-gray-800',
    input: 'bg-white border-gray-300 text-gray-900 focus:border-gray-500',
    messageMe: 'bg-gray-900 text-white',
    messageOther: 'bg-white text-gray-900 border-gray-200 shadow-sm',
    sidebar: 'bg-white border-gray-200',
    logItem: 'bg-gray-50 border-gray-200',
    ghost: 'bg-black/5 border-black/5',
    ghostHover: 'hover:bg-black/5',
    icon: 'text-gray-900',
    iconMuted: 'text-gray-400',
    subtle: 'text-black/10',
  }
};

const TOS_SECTIONS = [
  {
    title: "[서비스 이용 및 책임에 관한 사항]",
    items: [
      "본 서비스는 사용자의 익명성을 존중하지만, 타인의 권리를 침해하거나 법률을 위반하는 행위까지 보호하지 않습니다.",
      "사용자가 작성한 메시지 및 공유한 미디어로 인해 발생하는 모든 법적 책임은 해당 콘텐츠를 게시한 사용자 본인에게 있습니다.",
      "플랫폼은 사용자 간의 대화 내용에 개입하지 않으며, 대화 상대를 선택하고 소통하는 과정에서 발생하는 개인적인 분쟁에 대해 책임을 지지 않습니다."
    ]
  },
  {
    title: "[금지 행위 및 제재 안내]",
    items: [
      "성매매 알선, 아동·청소년 성착취물 공유, 불법 촬영물 유포 등 실정법에 위반되는 행위 적발 시 즉시 서비스 이용이 영구 제한되며 관련 수사 기관에 협조할 수 있습니다.",
      "상대방의 동의 없는 개인정보(이름, 연락처, 주소, SNS 등) 요구 및 유출, 스토킹, 지속적인 괴롭힘 행위를 엄격히 금지합니다.",
      "욕설, 비속어 사용, 특정 계층에 대한 차별·비하 발언, 도배 행위 등 커뮤니티 가이드라인을 위반할 경우 서비스 이용 정지 조치가 취해질 수 있습니다."
    ]
  },
  {
    title: "[데이터 처리 및 익명성 보장]",
    items: [
      "대화 내용은 원칙적으로 암호화되어 관리되나, 신고 접수 또는 법적 요청이 있을 경우 검토를 위해 일정 기간 보관될 수 있습니다.",
      "익명 채팅의 특성상 상대방이 본인을 사칭하거나 허위 정보를 제공할 수 있으므로, 금전 거래나 오프라인 만남 시 각별한 주의를 요구합니다."
    ]
  }
];

const PROFANITY_LIST = ['시발', '씨발', '병신', '엠창', '느금', '섹스', '자지', '보지', '개새끼', '미친년', '미친놈', '지랄', '좆', '썅', '병크', '일베', '메갈', '워마드', '한남', '김치녀', '노무현', '운지', '앙기모찌'];

// --- Components ---

export default function App() {
  const [step, setStep] = useState<'landing' | 'intro' | 'tos' | 'nickname' | 'chat'>('landing');
  const [introStep, setIntroStep] = useState(0);
  const [tosAgreements, setTosAgreements] = useState<boolean[]>(new Array(TOS_SECTIONS.length).fill(false));
  const [nickname, setNickname] = useState('');
  const [userIp, setUserIp] = useState('0.0.0.0');
  const [showWelcome, setShowWelcome] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newNoticeText, setNewNoticeText] = useState('');
  const [tempNickname, setTempNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [points, setPoints] = useState(0);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showSpamPopup, setShowSpamPopup] = useState(false);
  const [showProfanityPopup, setShowProfanityPopup] = useState(false);
  const [lastMessageTimes, setLastMessageTimes] = useState<number[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [bannedUntil, setBannedUntil] = useState<Date | null>(null);
  const [banCountdown, setBanCountdown] = useState('');
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  const THEME = THEME_CONFIG[theme];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
      // Close message menu when clicking outside
      if (!(event.target as HTMLElement).closest('.message-action-trigger')) {
        setActiveMessageMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Handlers ---

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminId === 'yyeeoott' && adminPw === '112233') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminId('');
      setAdminPw('');
    } else {
      alert('관리자 정보가 일치하지 않습니다.');
    }
  };

  // --- Effects ---

  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase configuration error: client is offline.");
        }
      }
    };
    testConnection();

    // Fetch IP and Check Existing User
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(async (data) => {
        setUserIp(data.ip);
        // Check if user exists for this IP
        const userDoc = await getDocFromServer(doc(db, 'users', data.ip.replace(/\./g, '_')));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setNickname(userData.nickname);
          setPoints(userData.points || 0);
          setHasExistingAccount(true);
        }
      })
      .catch(() => setUserIp('Unknown'));

    // Cumulative users count
    const unsubscribeTotal = onSnapshot(collection(db, 'users'), (snapshot) => {
      setTotalUsersCount(snapshot.size);
    });

    // Fetch Notice
    const unsubscribeNotice = onSnapshot(doc(db, 'notices', 'current'), (doc) => {
      if (doc.exists()) {
        setNotice(doc.data() as Notice);
      }
    });

    return () => {
      unsubscribeTotal();
      unsubscribeNotice();
    };
  }, []);

  useEffect(() => {
    if (step === 'chat') {
      const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'), limit(100));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        setMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }, (error) => {
        console.error("Firestore Error (messages):", error);
      });

      const qSessions = query(collection(db, 'sessions'), orderBy('lastActive', 'desc'));
      const unsubscribeSessions = onSnapshot(qSessions, (snapshot) => {
        const now = Date.now();
        const sess = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as UserSession))
          // Only show users active in the last 2 minutes
          .filter(s => {
            const lastActive = s.lastActive?.toMillis?.() || 0;
            return now - lastActive < 120000;
          });
        setSessions(sess);
      });

      const qLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50));
      const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
        const l = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Log));
        setLogs(l);
      });

      // Update session
      const sessionId = `session_${Date.now()}`;
      const sessionRef = doc(db, 'sessions', sessionId);
      setDoc(sessionRef, {
        nickname,
        ip: userIp,
        lastActive: serverTimestamp()
      });

      // Log join
      addDoc(collection(db, 'logs'), {
        type: 'JOIN',
        content: `${nickname} joined the chat.`,
        timestamp: serverTimestamp(),
        ip: userIp,
        nickname
      });

      const interval = setInterval(() => {
        updateDoc(sessionRef, { lastActive: serverTimestamp() });
      }, 30000);

      return () => {
        unsubscribe();
        unsubscribeSessions();
        unsubscribeLogs();
        clearInterval(interval);
        deleteDoc(sessionRef);
        addDoc(collection(db, 'logs'), {
          type: 'LEAVE',
          content: `${nickname} left the chat.`,
          timestamp: serverTimestamp(),
          ip: userIp,
          nickname
        });
      };
    }
  }, [step, nickname, userIp]);

  // Fetch all users for admin panel
  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  // Check ban/mute status periodically or on mount
  useEffect(() => {
    if (nickname && userIp) {
      const userRef = doc(db, 'users', userIp.replace(/\./g, '_'));
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isBanned) {
            const until = data.bannedUntil?.toDate?.() || new Date(data.bannedUntil);
            if (until > new Date()) {
              setIsBanned(true);
              setBannedUntil(until);
            } else {
              setIsBanned(false);
              setBannedUntil(null);
            }
          } else {
            setIsBanned(false);
            setBannedUntil(null);
          }
          setIsMuted(!!data.isMuted);
          setPoints(data.points || 0);
        }
      });
      return () => unsubscribe();
    }
  }, [nickname, userIp]);

  // Ban Countdown Timer
  useEffect(() => {
    if (!isBanned || !bannedUntil) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = bannedUntil.getTime() - now.getTime();
      
      if (diff <= 0) {
        setIsBanned(false);
        setBanCountdown('');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setBanCountdown(`${days > 0 ? days + '일 ' : ''}${hours}시간 ${minutes}분 ${seconds}초`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isBanned, bannedUntil]);

  // --- Handlers ---

  // Trending Topics Logic
  useEffect(() => {
    if (messages.length === 0) return;
    
    const stopWords = ['진짜', '너무', '그냥', '오늘', '지금', '근데', '하고', '해서', '하는', '합니다', '입니다', '하고', '어떻게', '왜', '무슨', '어디', '언제', '누구', '어떤', '이거', '저거', '그거', '우리', '너희', '당신', '사람', '생각', '말', '것', '수', '등', '나', '너', '저', '나도', '너도', '우리도', '이', '그', '저', '요', '네', '아니오', '응', '아니', '그래', '맞아', '그렇지', '그럼', '그래서', '그러니까', '하지만', '그런데', '그래도', '그리고', '또', '더', '많이', '조금', '매우', '정말', '참', '아주', '가장', '제일', '특히', '항상', '자주', '가끔', '전혀', '결코', '이미', '벌써', '아직', '방금', '금방', '곧', '나중에', '이따가', '먼저', '다음에', '함께', '같이', '혼자', '서로', '모두', '전부', '다', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
    
    const wordCounts: Record<string, number> = {};
    const recentMessages = messages.slice(-50); // Analyze last 50 messages
    
    recentMessages.forEach(msg => {
      if (msg.type === 'poll') return;
      if (!msg.text) return;
      const words = msg.text.split(/\s+/);
      words.forEach(word => {
        const cleanWord = word.replace(/[^\w\s가-힣]/g, '').trim();
        if (cleanWord.length > 1 && !stopWords.includes(cleanWord)) {
          wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
        }
      });
    });
    
    const sortedWords = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
      
    setTrendingTopics(sortedWords);
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
    
    const words = value.split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    if (lastWord.startsWith('@')) {
      const search = lastWord.substring(1);
      setMentionSearch(search);
      setShowMentionList(true);
    } else {
      setShowMentionList(false);
    }
  };

  const selectMention = (userNickname: string) => {
    const words = inputText.split(/\s+/);
    words.pop(); // Remove the partial @mention
    const newValue = [...words, `@${userNickname} `].join(' ').trimStart();
    setInputText(newValue);
    setShowMentionList(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    if (isMuted) {
      return;
    }

    // Profanity Filter
    const hasProfanity = PROFANITY_LIST.some(p => inputText.includes(p));
    if (hasProfanity) {
      setShowProfanityPopup(true);
      return;
    }

    // Spam Prevention
    const now = Date.now();
    const recentMessages = lastMessageTimes.filter(t => now - t < 2000);
    if (recentMessages.length >= 3) {
      setShowSpamPopup(true);
      return;
    }
    setLastMessageTimes([...recentMessages, now]);

    let finalIsHighlight = false;
    if (isHighlightMode) {
      if (points < 50) {
        alert('포인트가 부족합니다. (필요: 50P)');
        setIsHighlightMode(false);
        return;
      }
      finalIsHighlight = true;
    }

    const mentions = inputText.match(/@(\S+)/g)?.map(m => m.substring(1)) || [];

    const msgData = {
      text: inputText,
      senderNickname: nickname,
      senderIp: userIp,
      timestamp: serverTimestamp(),
      replyToId: replyingTo?.id || null,
      reactions: {},
      isHighlight: finalIsHighlight,
      type: 'text',
      mentions
    };

    try {
      await addDoc(collection(db, 'messages'), msgData);
      
      const userRef = doc(db, 'users', userIp.replace(/\./g, '_'));
      let newPoints = points + 5; // Award 5 points for every message
      
      if (finalIsHighlight) {
        newPoints -= 50; // Deduct 50 points for highlight (net -45)
      }
      
      await updateDoc(userRef, { points: newPoints });
      setPoints(newPoints);

      setInputText('');
      setReplyingTo(null);
      setIsHighlightMode(false);
      
      // Log message
      addDoc(collection(db, 'logs'), {
        type: 'MESSAGE',
        content: `${nickname} sent a message: ${inputText.substring(0, 50)}...`,
        timestamp: serverTimestamp(),
        ip: userIp,
        nickname
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const msgRef = doc(db, 'messages', messageId);
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const currentReactions = msg.reactions || {};
    const newReactions = { ...currentReactions };
    newReactions[emoji] = (newReactions[emoji] || 0) + 1;

    await updateDoc(msgRef, { reactions: newReactions });
    
    // Log reaction
    addDoc(collection(db, 'logs'), {
      type: 'REACTION',
      content: `${nickname} reacted with ${emoji} to message ${messageId}`,
      timestamp: serverTimestamp(),
      ip: userIp,
      nickname
    });
  };

  const handleDeleteMessage = async (messageId: string, senderIp: string) => {
    if (senderIp !== userIp && !isAdmin) {
      return;
    }
    setMessageToDelete(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      await deleteDoc(doc(db, 'messages', messageToDelete));
      
      // Log deletion
      addDoc(collection(db, 'logs'), {
        type: 'DELETE',
        content: `${nickname} deleted message ${messageToDelete}`,
        timestamp: serverTimestamp(),
        ip: userIp,
        nickname
      });
      setMessageToDelete(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      setMessageToDelete(null);
    }
  };

  const handleBanUser = async (userIp: string, days: number) => {
    if (!isAdmin) return;
    try {
      const userDocId = userIp.replace(/\./g, '_');
      const userRef = doc(db, 'users', userDocId);
      const bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + days);
      
      await updateDoc(userRef, {
        isBanned: true,
        bannedUntil: bannedUntil
      });
      
      addDoc(collection(db, 'logs'), {
        type: 'BAN',
        content: `Admin banned user ${userIp} for ${days} days.`,
        timestamp: serverTimestamp(),
        ip: userIp,
        nickname: 'System'
      });
    } catch (error) {
      console.error("Error banning user:", error);
    }
  };

  const handleUnbanUser = async (userIp: string) => {
    if (!isAdmin) return;
    try {
      const userDocId = userIp.replace(/\./g, '_');
      const userRef = doc(db, 'users', userDocId);
      await updateDoc(userRef, {
        isBanned: false,
        bannedUntil: null
      });
    } catch (error) {
      console.error("Error unbanning user:", error);
    }
  };

  const handleToggleMute = async (userIp: string, currentMute: boolean) => {
    if (!isAdmin) return;
    try {
      const userDocId = userIp.replace(/\./g, '_');
      const userRef = doc(db, 'users', userDocId);
      await updateDoc(userRef, {
        isMuted: !currentMute
      });
      
      addDoc(collection(db, 'logs'), {
        type: 'MUTE',
        content: `Admin ${!currentMute ? 'muted' : 'unmuted'} user ${userIp}.`,
        timestamp: serverTimestamp(),
        ip: userIp,
        nickname: 'System'
      });
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      alert('질문과 최소 2개의 선택지를 입력해주세요.');
      return;
    }

    const pollData = {
      question: pollQuestion,
      options: pollOptions.filter(o => o.trim()).map(o => ({ text: o, votes: [] })),
      totalVotes: 0,
      isClosed: false
    };

    const msgData = {
      text: `[투표] ${pollQuestion}`,
      senderNickname: nickname,
      senderIp: userIp,
      timestamp: serverTimestamp(),
      type: 'poll',
      pollData
    };

    try {
      await addDoc(collection(db, 'messages'), msgData);
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowPlusMenu(false);
      
      addDoc(collection(db, 'logs'), {
        type: 'POLL_CREATE',
        content: `${nickname} created a poll: ${pollQuestion}`,
        timestamp: serverTimestamp(),
        ip: userIp,
        nickname
      });
    } catch (error) {
      console.error("Error creating poll:", error);
    }
  };

  const handleVote = async (messageId: string, optionIndex: number) => {
    const msgRef = doc(db, 'messages', messageId);
    const msg = messages.find(m => m.id === messageId);
    if (!msg || !msg.pollData || msg.pollData.isClosed) return;

    const newOptions = [...msg.pollData.options];
    const userId = userIp.replace(/\./g, '_');
    
    // Check if user already voted in any option
    const alreadyVoted = newOptions.some(opt => opt.votes.includes(userId));
    if (alreadyVoted) {
      alert('이미 투표하셨습니다.');
      return;
    }

    newOptions[optionIndex].votes.push(userId);
    const newTotalVotes = msg.pollData.totalVotes + 1;

    await updateDoc(msgRef, {
      'pollData.options': newOptions,
      'pollData.totalVotes': newTotalVotes
    });
  };

  const handleNicknameSubmit = async () => {
    if (!nickname.trim()) return;
    setNicknameError('');
    
    try {
      const userDocId = userIp.replace(/\./g, '_');
      const userRef = doc(db, 'users', userDocId);
      const userDoc = await getDocFromServer(userRef);

      if (!userDoc.exists()) {
        // Check if nickname is already taken by someone else
        const q = query(collection(db, 'users'), where('nickname', '==', nickname.trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setNicknameError('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
          return;
        }

        await setDoc(userRef, {
          nickname: nickname.trim(),
          ip: userIp,
          createdAt: serverTimestamp(),
          points: 1000, // Initial points for new users
          isBanned: false,
          isMuted: false
        });
        setPoints(1000);
      } else {
        const data = userDoc.data();
        if (data.isBanned) {
          const bannedUntil = data.bannedUntil?.toDate?.() || new Date(data.bannedUntil);
          if (bannedUntil > new Date()) {
            setNicknameError(`이용이 제한된 계정입니다. (종료: ${format(bannedUntil, 'yyyy-MM-dd HH:mm:ss')})`);
            return;
          }
        }
      }
      
      setStep('chat');
      setShowWelcome(true);
    } catch (error) {
      console.error("Error submitting nickname:", error);
      setNicknameError('오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 500KB for base64 storage in Firestore
    if (file.size > 512000) {
      alert('이미지 크기가 너무 큽니다. 500KB 이하의 이미지만 업로드 가능합니다.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        await addDoc(collection(db, 'messages'), {
          imageUrl: base64,
          senderNickname: nickname,
          senderIp: userIp,
          timestamp: serverTimestamp(),
          replyToId: replyingTo?.id || null,
          reactions: {}
        });
        
        const userRef = doc(db, 'users', userIp.replace(/\./g, '_'));
        const newPoints = points + 5;
        await updateDoc(userRef, { points: newPoints });
        setPoints(newPoints);

        setReplyingTo(null);
        
        // Log image upload
        addDoc(collection(db, 'logs'), {
          type: 'IMAGE',
          content: `${nickname} uploaded an image.`,
          timestamp: serverTimestamp(),
          ip: userIp,
          nickname
        });
      } catch (error) {
        console.error("Error uploading image:", error);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateNotice = async () => {
    if (!newNoticeText.trim()) return;
    try {
      await setDoc(doc(db, 'notices', 'current'), {
        text: newNoticeText,
        updatedAt: serverTimestamp(),
        author: 'Admin'
      });
      setShowNoticeModal(false);
      setNewNoticeText('');
      
      // Log notice update
      addDoc(collection(db, 'logs'), {
        type: 'NOTICE',
        content: `Notice updated: ${newNoticeText.substring(0, 50)}...`,
        timestamp: serverTimestamp(),
        ip: userIp,
        nickname: 'Admin'
      });
    } catch (error) {
      console.error("Error updating notice:", error);
    }
  };

  const handleUpdateNickname = () => {
    // Nickname change is now disabled as per user request
    alert('닉네임은 나중에 변경할 수 없습니다.');
  };

  // --- Render Helpers ---

  const renderLanding = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center p-8"
    >
      <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-2xl border backdrop-blur-sm", THEME.ghost)}>
        <MessageSquare className={cn("w-12 h-12", THEME.iconMuted)} />
      </div>
      <h1 className="text-4xl font-black mb-12 tracking-tighter">익CHAT</h1>
      <button 
        onClick={() => setStep('intro')}
        className={cn(
          "px-12 py-4 rounded-2xl font-bold text-lg transition-all transform active:scale-95 shadow-xl",
          THEME.accent
        )}
      >
        입장하기
      </button>
    </motion.div>
  );

  const renderIntro = () => {
    return (
      <div className="max-w-2xl w-full flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        {/* Title Part - Persists and moves up */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 1,
            y: introStep === 2 ? -40 : 0,
            scale: introStep === 2 ? 0.8 : 1
          }}
          transition={{ 
            opacity: { duration: 1 },
            y: { duration: 0.8, ease: "easeInOut" },
            scale: { duration: 0.8, ease: "easeInOut" }
          }}
          onAnimationComplete={() => {
            if (introStep === 0) {
              setTimeout(() => setIntroStep(2), 1500);
            }
          }}
          className="flex items-center justify-center text-5xl font-black tracking-tighter"
        >
          <span>익</span>
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className={cn("overflow-hidden whitespace-nowrap", THEME.iconMuted)}
          >
            명의&nbsp;
          </motion.span>
          <span>CHAT</span>
        </motion.div>

        {/* Second Part - Appears below */}
        <AnimatePresence>
          {introStep === 2 && (
            <motion.div
              key="intro-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col items-center gap-12 mt-8"
            >
              <p className="text-2xl font-bold break-keep">
                먼저, 서비스 이용을 위해서<br />
                이용약관 동의가 필요해요!
              </p>
              
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                onClick={() => setStep('tos')}
                className={cn(
                  "px-10 py-4 rounded-2xl font-bold text-lg transition-all transform active:scale-95 shadow-xl",
                  THEME.accent
                )}
              >
                이용약관 동의하러 가기
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderToS = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("max-w-2xl w-full p-8 rounded-2xl shadow-2xl border", THEME.card, THEME.border)}
    >
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className={cn("w-8 h-8", THEME.icon)} />
        <h1 className="text-2xl font-bold">서비스 이용 약관 동의</h1>
      </div>

      <div className="space-y-8 mb-8 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
        {TOS_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={cn("text-lg font-semibold", theme === 'dark' ? "text-white/90" : "text-gray-800")}>{section.title}</h2>
              <button 
                onClick={() => {
                  const newAgreements = [...tosAgreements];
                  newAgreements[idx] = !newAgreements[idx];
                  setTosAgreements(newAgreements);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg border-2",
                  tosAgreements[idx] 
                    ? "bg-green-500 border-green-400 text-white" 
                    : theme === 'dark' ? "bg-white text-black border-gray-300 hover:bg-gray-100" : "bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200"
                )}
              >
                {tosAgreements[idx] ? <CheckCircle2 className="w-4 h-4" /> : null}
                {tosAgreements[idx] ? "동의 완료" : "동의하기"}
              </button>
            </div>
            <ul className={cn("space-y-2 pl-4 border-l", theme === 'dark' ? "border-white/10" : "border-gray-200")}>
              {section.items.map((item, i) => (
                <li key={i} className={cn("text-sm leading-relaxed", THEME.textMuted)}>
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <button 
          onClick={() => {
            setTosAgreements(new Array(TOS_SECTIONS.length).fill(true));
            setStep('nickname');
          }}
          className={cn("text-xs transition-colors underline underline-offset-4", THEME.textMuted, theme === 'dark' ? "hover:text-white" : "hover:text-black")}
        >
          모든 약관에 동의하고 계속하기 (빠른 입장)
        </button>

        <button 
          disabled={!tosAgreements.every(v => v)}
          onClick={() => setStep('nickname')}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-base transition-all transform active:scale-95",
            tosAgreements.every(v => v) 
              ? THEME.accent 
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          )}
        >
          이해했습니다
        </button>
      </div>
    </motion.div>
  );

  const renderNicknameEntry = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("max-w-md w-full p-8 rounded-2xl shadow-2xl border", THEME.card, THEME.border)}
    >
      <div className="flex flex-col items-center text-center mb-8">
        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", THEME.ghost)}>
          <User className={cn("w-8 h-8", THEME.icon)} />
        </div>
        <h1 className="text-2xl font-bold mb-2">닉네임 설정</h1>
        <p className={cn("text-sm", THEME.textMuted)}>채팅방에서 사용할 닉네임을 입력해주세요.</p>
      </div>

      <div className="space-y-6">
        <div className="relative">
          <input 
            type="text"
            value={nickname}
            onChange={(e) => !hasExistingAccount && setNickname(e.target.value)}
            placeholder={hasExistingAccount ? "" : "닉네임을 입력하세요 (최대 12자)"}
            maxLength={12}
            disabled={hasExistingAccount}
            className={cn(
              "w-full border rounded-xl px-4 py-4 focus:outline-none transition-all", 
              THEME.input,
              hasExistingAccount && "opacity-60 cursor-not-allowed bg-gray-800/20"
            )}
            onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()}
          />
          {nicknameError && (
            <p className="text-xs text-red-500 mt-2 ml-1 font-medium">
              {nicknameError}
            </p>
          )}
          {!hasExistingAccount && !nicknameError && (
            <p className="text-[11px] text-gray-500 mt-2 ml-1 leading-relaxed">
              * 닉네임은 <span className="text-red-400 font-bold">나중에 변경이 불가능</span>하므로 신중하게 결정해주세요.<br/>
              * 중복된 닉네임은 사용할 수 없습니다.
            </p>
          )}
          {hasExistingAccount && (
            <p className="text-[10px] text-gray-500 mt-2 ml-1">
              * 이 IP는 이미 등록된 닉네임이 있습니다. (1인 1계정 원칙)
            </p>
          )}
        </div>

        <button 
          disabled={!nickname.trim()}
          onClick={handleNicknameSubmit}
          className={cn(
            "w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95",
            nickname.trim() ? THEME.accent : "bg-gray-800 text-gray-500 cursor-not-allowed"
          )}
        >
          {hasExistingAccount ? "기존 계정으로 입장" : "채팅방 입장하기"}
        </button>
      </div>
    </motion.div>
  );

  const renderPollModal = () => (
    <AnimatePresence>
      {showPollModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn("max-w-md w-full p-8 rounded-2xl shadow-2xl border", THEME.card, THEME.border)}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-yellow-500" />
                투표 만들기
              </h2>
              <button onClick={() => setShowPollModal(false)} className={cn("p-1 rounded-full", THEME.ghostHover)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={cn("text-xs mb-1 block", THEME.textMuted)}>질문</label>
                <input 
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="무엇을 물어볼까요?"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none", THEME.input)}
                />
              </div>
              <div className="space-y-2">
                <label className={cn("text-xs mb-1 block", THEME.textMuted)}>선택지 (최대 5개)</label>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input 
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[i] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      placeholder={`옵션 ${i + 1}`}
                      className={cn("flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none", THEME.input)}
                    />
                    {pollOptions.length > 2 && (
                      <button 
                        onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 5 && (
                  <button 
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className={cn("w-full py-2 border border-dashed rounded-xl text-xs transition-colors", theme === 'dark' ? "border-white/20 text-gray-500 hover:bg-white/5" : "border-gray-300 text-gray-500 hover:bg-gray-50")}
                  >
                    + 옵션 추가
                  </button>
                )}
              </div>
              <button 
                onClick={handleCreatePoll}
                disabled={!pollQuestion.trim() || pollOptions.some(o => !o.trim())}
                className={cn("w-full py-3 rounded-xl font-bold mt-4 transition-all transform active:scale-95", THEME.accent)}
              >
                투표 생성하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderDeleteConfirmModal = () => (
    <AnimatePresence>
      {messageToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn("max-w-sm w-full p-8 rounded-2xl shadow-2xl border text-center", THEME.card, THEME.border)}
          >
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6", theme === 'dark' ? "bg-red-500/10" : "bg-red-50")}>
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-4">메시지 삭제</h2>
            <p className={cn("text-sm leading-relaxed mb-8", THEME.textMuted)}>
              정말로 이 메시지를 삭제하시겠습니까?<br />
              삭제된 메시지는 복구할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setMessageToDelete(null)}
                className={cn("flex-1 py-3 rounded-xl font-bold transition-all", THEME.ghost, THEME.ghostHover)}
              >
                취소
              </button>
              <button 
                onClick={confirmDeleteMessage}
                className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all transform active:scale-95"
              >
                삭제
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderChat = () => (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <header className={cn("h-16 border-b flex items-center justify-between px-4 shrink-0 z-20", THEME.card, THEME.border)}>
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", THEME.ghost)}>
              <MessageSquare className={cn("w-5 h-5", THEME.icon)} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-tight">익CHAT</span>
              <div className={cn("flex items-center gap-1 text-[10px]", THEME.textMuted)}>
                <Users className="w-3 h-3" />
                <span>{sessions.length}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowLogs(!showLogs)}
                  className={cn("p-2 rounded-full transition-colors", showLogs ? "bg-white/10 text-white" : THEME.ghostHover)}
                  title="시스템 로그"
                >
                  <History className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    setNewNoticeText(notice?.text || '');
                    setShowNoticeModal(true);
                  }}
                  className={cn("p-2 rounded-full transition-colors text-yellow-500", THEME.ghostHover)}
                  title="공지사항 작성"
                >
                  <Megaphone className="w-5 h-5" />
                </button>
              </div>
            )}
            <button 
              onClick={() => setShowSettingsModal(true)}
              className={cn("p-2 rounded-full transition-colors", THEME.ghostHover)}
            >
              <Menu className={cn("w-5 h-5", THEME.icon)} />
            </button>
          </div>
        </header>

        {/* Trending Topics Bar */}
        {trendingTopics.length > 0 && (
          <div className={cn("px-4 py-2 border-b flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 z-10", THEME.bg, THEME.border)}>
            <div className={cn("flex items-center gap-1 text-[10px] font-black shrink-0 uppercase tracking-widest", THEME.subtle)}>
              <Hash className="w-3 h-3" />
              <span>TRENDING</span>
            </div>
            <div className="flex items-center gap-2">
              {trendingTopics.map((topic, i) => (
                <button
                  key={i}
                  onClick={() => setInputText(prev => prev + (prev ? ' ' : '') + topic)}
                  className={cn("px-3 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors", THEME.ghost, THEME.ghostHover)}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className={cn("flex-1 overflow-y-auto p-6 custom-scrollbar relative", isBanned && "overflow-hidden")}>
          <div className={cn("space-y-6 transition-all duration-500", isBanned && "blur-md pointer-events-none select-none")}>
            {/* Notice Bar */}
          <AnimatePresence>
            {notice && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "sticky top-0 z-10 mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-lg",
                  theme === 'dark' ? "bg-white/5 border-white/10 backdrop-blur-md" : "bg-white border-gray-200 shadow-sm"
                )}
              >
                <Megaphone className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-1">공지사항</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{notice.text}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.map((msg) => {
            const isMe = msg.senderIp === userIp;
            const repliedMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;

            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn("flex flex-col max-w-[85%] sm:max-w-[70%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}
              >
                {!isMe && (
                  <div className="flex items-center gap-2 mb-1.5 ml-1">
                    <span className={cn("text-sm font-extrabold tracking-tight", theme === 'dark' ? "text-white/90" : "text-gray-800")}>{msg.senderNickname}</span>
                    {isAdmin && <span className="text-[9px] text-gray-600 font-mono">({msg.senderIp})</span>}
                  </div>
                )}

                <div className="relative">
                  {/* Reply Context */}
                  {repliedMsg && (
                    <div className={cn(
                      "mb-[-8px] pb-2 pt-1 px-3 rounded-t-xl text-[10px] border-x border-t max-w-full truncate",
                      THEME.textMuted, THEME.ghost,
                      isMe ? "text-right" : "text-left"
                    )}>
                      <Reply className="w-3 h-3 inline mr-1 opacity-50" />
                      {repliedMsg.senderNickname}: {repliedMsg.text}
                    </div>
                  )}

                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm relative",
                    msg.isHighlight ? "rainbow-border" : (isMe ? THEME.messageMe + " rounded-tr-none" : THEME.messageOther + " rounded-tl-none")
                  )}>
                    {msg.imageUrl && (
                      <div className={cn("mb-2 rounded-lg overflow-hidden border", theme === 'dark' ? "border-white/10" : "border-gray-200")}>
                        <img 
                          src={msg.imageUrl} 
                          alt="Uploaded" 
                          className="max-w-full h-auto block"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    {msg.type === 'poll' && msg.pollData && (
                      <div className="space-y-4 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-4 h-4 text-yellow-500" />
                          <span className="font-bold text-xs uppercase tracking-wider">실시간 투표</span>
                        </div>
                        <p className="text-sm font-bold mb-4 leading-tight">{msg.pollData.question}</p>
                        <div className="space-y-2">
                          {msg.pollData.options.map((opt, i) => {
                            const percentage = msg.pollData!.totalVotes > 0 
                              ? Math.round((opt.votes.length / msg.pollData!.totalVotes) * 100) 
                              : 0;
                            const hasVoted = opt.votes.includes(userIp.replace(/\./g, '_'));
                            
                            return (
                              <button
                                key={i}
                                onClick={() => handleVote(msg.id, i)}
                                disabled={msg.pollData!.isClosed}
                                className={cn(
                                  "w-full relative h-10 rounded-xl overflow-hidden border transition-all text-left group",
                                  hasVoted ? "border-yellow-500/50 bg-yellow-500/10" : cn("border-white/10 hover:bg-white/10", theme === 'dark' ? "bg-white/5" : "bg-black/5")
                                )}
                              >
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  className={cn("absolute inset-y-0 left-0 transition-all", hasVoted ? "bg-yellow-500/20" : (theme === 'dark' ? "bg-white/10" : "bg-black/10"))}
                                />
                                <div className="absolute inset-0 px-3 flex items-center justify-between text-[11px]">
                                  <span className="font-medium truncate pr-8">{opt.text}</span>
                                  <span className="font-bold shrink-0">{percentage}%</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex justify-between items-center pt-2 text-[10px] text-gray-500 font-medium">
                          <span>총 {msg.pollData.totalVotes}명 참여</span>
                          {msg.pollData.isClosed && <span className="text-red-500">종료됨</span>}
                        </div>
                      </div>
                    )}
                    {msg.type !== 'poll' && msg.text && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.text.split(/(@\S+)/).map((part, i) => {
                          if (part.startsWith('@')) {
                            return <span key={i} className="text-blue-400 font-bold">{part}</span>;
                          }
                          return part;
                        })}
                      </p>
                    )}
                  </div>

                  {/* Message Actions Trigger */}
                  <div className={cn(
                    "absolute top-0 flex items-center gap-1",
                    isMe ? "right-full mr-2" : "left-full ml-2"
                  )}>
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id);
                        }}
                        className={cn(
                          "message-action-trigger p-1.5 border rounded-lg transition-all",
                          activeMessageMenu === msg.id 
                            ? (theme === 'dark' ? "bg-white/10 border-white/20 text-white" : "bg-gray-100 border-gray-300 text-gray-900")
                            : (theme === 'dark' ? "bg-black/20 border-white/5 hover:bg-white/5 text-gray-500" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-400")
                        )}
                        title="더 보기"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {activeMessageMenu === msg.id && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className={cn(
                              "absolute z-50 min-w-[100px] py-1.5 rounded-xl shadow-xl border overflow-hidden",
                              isMe ? "right-0" : "left-0",
                              THEME.card, THEME.border
                            )}
                          >
                            <button 
                              onClick={() => {
                                setReplyingTo(msg);
                                setActiveMessageMenu(null);
                              }}
                              className={cn("w-full px-4 py-2 text-left text-xs font-bold flex items-center gap-2 transition-colors", THEME.ghostHover)}
                            >
                              <Reply className="w-3.5 h-3.5" />
                              답장
                            </button>
                            {(isMe || isAdmin) && (
                              <button 
                                onClick={() => {
                                  handleDeleteMessage(msg.id, msg.senderIp);
                                  setActiveMessageMenu(null);
                                }}
                                className={cn("w-full px-4 py-2 text-left text-xs font-bold flex items-center gap-2 transition-colors text-red-500", THEME.ghostHover)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                삭제
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <span className="text-[9px] text-gray-600 mt-1 px-1">
                  {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'a h:mm', { locale: ko }) : '...'}
                </span>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
          </div>

          {/* Ban Overlay */}
          <AnimatePresence>
            {isBanned && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn("absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-[2px] p-6 text-center", theme === 'dark' ? "bg-black/40" : "bg-white/40")}
              >
                <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-pulse", theme === 'dark' ? "bg-red-500/20" : "bg-red-50")}>
                  <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h2 className={cn("text-2xl font-bold mb-2", theme === 'dark' ? "text-white" : "text-gray-900")}>이용제한 사용자</h2>
                <p className={cn("text-sm mb-6 max-w-xs", theme === 'dark' ? "text-gray-200" : "text-gray-600")}>
                  운영 정책 위반으로 인해 현재 채팅방 이용이 제한되었습니다.
                </p>
                <div className={cn("border rounded-2xl px-6 py-4", theme === 'dark' ? "bg-black/60 border-white/10" : "bg-white border-gray-200 shadow-lg")}>
                  <p className={cn("text-[10px] uppercase tracking-widest mb-1", THEME.textMuted)}>남은 시간</p>
                  <p className="text-xl font-mono font-bold text-yellow-500">{banCountdown}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className={cn("p-4 border-t shrink-0", THEME.card, THEME.border)}>
          {replyingTo && (
            <div className={cn("mb-3 p-2 border rounded-xl flex items-center justify-between", THEME.ghost)}>
              <div className="flex items-center gap-2 overflow-hidden">
                <Reply className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="text-xs truncate">
                  <span className={cn("font-bold", theme === 'dark' ? "text-white/70" : "text-gray-700")}>{replyingTo.senderNickname}</span>
                  <span className={cn("ml-2", THEME.textMuted)}>{replyingTo.text}</span>
                </div>
              </div>
              <button onClick={() => setReplyingTo(null)} className={cn("p-1 rounded-full", THEME.ghostHover)}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <div className="relative" ref={plusMenuRef}>
              <button 
                type="button"
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  theme === 'dark' ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <Plus className={cn("w-5 h-5 transition-transform", showPlusMenu && "rotate-45")} />
              </button>
              
              <AnimatePresence>
                {showPlusMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={cn(
                      "absolute bottom-full left-0 mb-2 w-40 rounded-xl shadow-2xl border overflow-hidden z-50",
                      THEME.card, THEME.border
                    )}
                  >
                    <button 
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowPlusMenu(false);
                      }}
                      className={cn("w-full px-4 py-3 text-left text-sm transition-colors border-b", THEME.ghostHover, theme === 'dark' ? "border-white/5" : "border-gray-100")}
                    >
                      이미지 전송
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsHighlightMode(!isHighlightMode);
                        setShowPlusMenu(false);
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between border-b",
                        isHighlightMode ? (theme === 'dark' ? "bg-white/10 text-white" : "bg-black/10 text-black") : THEME.ghostHover,
                        theme === 'dark' ? "border-white/5" : "border-gray-100"
                      )}
                    >
                      강조 메시지
                      <span className="text-[10px] font-bold text-yellow-500">50P</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setShowPollModal(true);
                        setShowPlusMenu(false);
                      }}
                      className={cn("w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between", THEME.ghostHover)}
                    >
                      투표 올리기
                      <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            
            <div className="flex-1 relative">
              {/* Mention List */}
              <AnimatePresence>
                {showMentionList && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={cn("absolute bottom-full left-0 mb-2 w-full max-w-[200px] rounded-xl border shadow-2xl overflow-hidden z-50", THEME.card, THEME.border)}
                  >
                    <div className={cn("p-2 border-b flex items-center gap-2", THEME.ghost, theme === 'dark' ? "border-white/5" : "border-gray-100")}>
                      <AtSign className="w-3 h-3 text-gray-500" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">언급하기</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                      {sessions
                        .filter(s => s.nickname.toLowerCase().includes(mentionSearch.toLowerCase()))
                        .map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => selectMention(s.nickname)}
                            className={cn("w-full px-4 py-2 text-left text-xs transition-colors flex items-center gap-2", THEME.ghostHover)}
                          >
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold", THEME.ghost)}>
                              {s.nickname.substring(0, 1)}
                            </div>
                            <span>{s.nickname}</span>
                          </button>
                        ))}
                      {sessions.filter(s => s.nickname.toLowerCase().includes(mentionSearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-[10px] text-gray-500 italic">검색 결과 없음</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <input 
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={isMuted ? "관리자에 의해 메시지 전송이 차단되었습니다." : (isUploading ? "이미지 업로드 중..." : (isHighlightMode ? "강조 메시지 입력 중..." : "메시지를 입력하세요..."))}
                disabled={isUploading || isMuted}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all", 
                  THEME.input,
                  isHighlightMode && "rainbow-border",
                  isMuted && "opacity-50 cursor-not-allowed"
                )}
              />
              {isHighlightMode && !isMuted && (
                <div className="absolute -top-6 left-0 text-[10px] font-bold text-yellow-500 animate-pulse">
                  강조 모드 활성화 (50P 차감 예정)
                </div>
              )}
            </div>
            
            {!isMuted && (
              <button 
                type="submit"
                disabled={!inputText.trim() || isUploading}
                className={cn(
                  "px-5 py-3 rounded-xl flex items-center justify-center transition-all active:scale-95",
                  inputText.trim() && !isUploading ? THEME.accent : "bg-gray-800 text-gray-500 cursor-not-allowed"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Sidebar: Active Users & Logs */}
      <AnimatePresence>
        {showLogs && (
          <motion.aside 
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className={cn("w-80 border-l flex flex-col h-full shrink-0 absolute right-0 top-0 bottom-0 z-40 sm:relative", THEME.card, THEME.border)}
          >
            <div className="h-16 border-b flex items-center justify-between px-6 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                접속자 & 로그
              </h3>
              <button onClick={() => setShowLogs(false)} className={cn("p-1 rounded-full", THEME.ghostHover)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {/* Active Users */}
              <section>
                <h4 className={cn("text-[10px] font-bold uppercase tracking-wider mb-3", THEME.textMuted)}>접속 중인 사용자</h4>
                <div className="space-y-2">
                  {sessions.map(sess => (
                    <div key={sess.id} className={cn("flex items-center gap-3 p-2 rounded-lg border", THEME.logItem)}>
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold", theme === 'dark' ? "bg-white/10" : "bg-gray-100")}>
                        {sess.nickname.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{sess.nickname}</p>
                        <p className={cn("text-[9px]", THEME.textMuted)}>{sess.ip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Real-time Logs */}
              <section>
                <h4 className={cn("text-[10px] font-bold uppercase tracking-wider mb-3", THEME.textMuted)}>시스템 로그</h4>
                <div className="space-y-2 font-mono text-[9px]">
                  {logs.map(log => (
                    <div key={log.id} className={cn("p-2 border-l-2", THEME.logItem)}>
                      <div className={cn("flex justify-between mb-1", THEME.textMuted)}>
                        <span>[{log.type}]</span>
                        <span>{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm:ss') : ''}</span>
                      </div>
                      <p className={cn("break-all", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>{log.content}</p>
                      <p className={cn("mt-1", theme === 'dark' ? "text-gray-700" : "text-gray-400")}>IP: {log.ip}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={cn("max-w-sm w-full p-8 rounded-2xl shadow-2xl border", THEME.card, THEME.border)}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">관리자 로그인</h2>
                <button onClick={() => setShowAdminLogin(false)} className={cn("p-1 rounded-full", THEME.ghostHover)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className={cn("text-xs mb-1 block", THEME.textMuted)}>아이디</label>
                  <input 
                    type="text"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none", THEME.input)}
                  />
                </div>
                <div>
                  <label className={cn("text-xs mb-1 block", THEME.textMuted)}>비밀번호</label>
                  <input 
                    type="password"
                    value={adminPw}
                    onChange={(e) => setAdminPw(e.target.value)}
                    className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none", THEME.input)}
                  />
                </div>
                <button 
                  type="submit"
                  className={cn("w-full py-3 rounded-xl font-bold mt-4 transition-all transform active:scale-95", THEME.accent)}
                >
                  로그인
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Notice Modal */}
      <AnimatePresence>
        {showNoticeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={cn("max-w-md w-full p-8 rounded-2xl shadow-2xl border", THEME.card, THEME.border)}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-yellow-500" />
                  공지사항 작성
                </h2>
                <button onClick={() => setShowNoticeModal(false)} className={cn("p-1 rounded-full", THEME.ghostHover)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <textarea 
                  value={newNoticeText}
                  onChange={(e) => setNewNoticeText(e.target.value)}
                  placeholder="공지 내용을 입력하세요..."
                  rows={5}
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all resize-none", THEME.input)}
                />
                <button 
                  onClick={handleUpdateNotice}
                  className={cn("w-full py-3 rounded-xl font-bold transition-all transform active:scale-95", THEME.accent)}
                >
                  공지사항 업데이트
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={cn(
                "w-full p-8 rounded-2xl shadow-2xl border overflow-y-auto max-h-[90vh]", 
                isAdmin ? "max-w-2xl" : "max-w-sm",
                THEME.card, THEME.border
              )}
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {isAdmin ? "관리자 패널 & 설정" : "설정"}
                </h2>
                <button onClick={() => setShowSettingsModal(false)} className={cn("p-1 rounded-full", THEME.ghostHover)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className={cn("grid gap-8", isAdmin && "grid-cols-1 md:grid-cols-2")}>
                {/* Left Side: User Settings */}
                <div className="space-y-8">
                  {/* Theme Toggle */}
                  <section className="space-y-3">
                    <label className={cn("text-xs font-bold uppercase tracking-wider", THEME.textMuted)}>화면 모드</label>
                    <div className={cn("flex p-1 rounded-xl border", theme === 'dark' ? "bg-black/20 border-white/5" : "bg-gray-100 border-gray-200")}>
                      <button 
                        onClick={() => setTheme('dark')}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all",
                          theme === 'dark' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-gray-300"
                        )}
                      >
                        <Moon className="w-4 h-4" />
                        다크 모드
                      </button>
                      <button 
                        onClick={() => setTheme('light')}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all",
                          theme === 'light' ? "bg-gray-900 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                        )}
                      >
                        <Sun className="w-4 h-4" />
                        라이트 모드
                      </button>
                    </div>
                  </section>

                  <div className={cn("p-4 rounded-xl border space-y-2", theme === 'dark' ? "bg-black/20 border-white/5" : "bg-gray-50 border-gray-200")}>
                    <p className={cn("text-[11px] font-bold", THEME.textMuted)}>계정 정보</p>
                    <div className="flex justify-between items-center">
                      <span className={cn("text-xs", THEME.textMuted)}>닉네임</span>
                      <span className="text-xs font-bold">{nickname}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={cn("text-xs", THEME.textMuted)}>아이피</span>
                      <span className={cn("text-[10px]", THEME.textMuted)}>{userIp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={cn("text-xs", THEME.textMuted)}>포인트</span>
                      <span className="text-xs font-bold text-yellow-500 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {points.toLocaleString()}P
                      </span>
                    </div>
                    <p className={cn("text-[10px] text-red-500/70 mt-2 pt-2 border-t", theme === 'dark' ? "border-white/5" : "border-gray-200")}>
                      * 닉네임은 1인 1계정 원칙에 따라 변경이 불가능합니다.
                    </p>
                  </div>

                  {/* Admin Actions */}
                  <section className="space-y-3 pt-4 border-t border-white/5">
                    <label className={cn("text-xs font-bold uppercase tracking-wider", THEME.textMuted)}>관리자 도구</label>
                    {!isAdmin ? (
                      <button 
                        onClick={() => {
                          setShowSettingsModal(false);
                          setShowAdminLogin(true);
                        }}
                        className={cn("w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all", THEME.ghost, THEME.ghostHover)}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        관리자 로그인
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => {
                            setShowSettingsModal(false);
                            setShowLogs(true);
                          }}
                          className={cn("py-3 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 transition-all", THEME.ghost, THEME.ghostHover)}
                        >
                          <History className="w-4 h-4" />
                          시스템 로그
                        </button>
                        <button 
                          onClick={() => {
                            setShowSettingsModal(false);
                            setShowNoticeModal(true);
                          }}
                          className={cn("py-3 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 transition-all", THEME.ghost, THEME.ghostHover)}
                        >
                          <Megaphone className="w-4 h-4" />
                          공지 작성
                        </button>
                        <button 
                          onClick={() => {
                            setIsAdmin(false);
                            setShowSettingsModal(false);
                          }}
                          className={cn("col-span-2 py-3 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 transition-all text-red-500", THEME.ghost, THEME.ghostHover)}
                        >
                          <X className="w-4 h-4" />
                          관리자 로그아웃
                        </button>
                      </div>
                    )}
                  </section>
                </div>

                {/* Right Side: Admin User Management (Only for Admins) */}
                {isAdmin && (
                  <div className={cn("space-y-4 border-t md:border-t-0 md:border-l md:pl-8", theme === 'dark' ? "border-white/10" : "border-gray-200")}>
                    <h3 className="text-sm font-bold flex items-center gap-2 text-yellow-500">
                      <ShieldAlert className="w-4 h-4" />
                      사용자 관리
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {allUsers.map(u => (
                        <div key={u.id} className={cn("p-3 rounded-xl border space-y-2", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200")}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold">{u.nickname}</p>
                              <p className={cn("text-[9px]", THEME.textMuted)}>{u.ip}</p>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleToggleMute(u.ip, u.isMuted)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors",
                                  u.isMuted ? "bg-orange-500/20 text-orange-500" : cn(THEME.ghost, THEME.textMuted, THEME.ghostHover)
                                )}
                                title={u.isMuted ? "채팅 차단 해제" : "채팅 차단"}
                              >
                                {u.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                              </button>
                              {u.isBanned ? (
                                <button 
                                  onClick={() => handleUnbanUser(u.ip)}
                                  className="p-1.5 rounded-lg bg-red-500/20 text-red-500"
                                  title="밴 해제"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => handleBanUser(u.ip, 1)}
                                    className={cn("px-2 py-1 rounded-lg text-[9px] transition-colors", THEME.ghost, THEME.textMuted, "hover:bg-red-500/20 hover:text-red-500")}
                                  >
                                    1일 밴
                                  </button>
                                  <button 
                                    onClick={() => handleBanUser(u.ip, 7)}
                                    className={cn("px-2 py-1 rounded-lg text-[9px] transition-colors", THEME.ghost, THEME.textMuted, "hover:bg-red-500/20 hover:text-red-500")}
                                  >
                                    7일 밴
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {u.isBanned && u.bannedUntil && (
                            <p className="text-[9px] text-red-400">
                              밴 종료: {format(u.bannedUntil.toDate?.() || new Date(u.bannedUntil), 'MM/dd HH:mm')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profanity Prevention Modal */}
      <AnimatePresence>
        {showProfanityPopup && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn("max-w-sm w-full p-8 rounded-2xl shadow-2xl border text-center", THEME.card, THEME.border)}
            >
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6", theme === 'dark' ? "bg-orange-500/10" : "bg-orange-50")}>
                <ShieldAlert className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold mb-4">욕설 방지 시스템</h2>
              <p className={cn("text-sm leading-relaxed mb-8", THEME.textMuted)}>
                비속어 및 욕설이 포함된 메시지는 전송할 수 없습니다. 바른 언어 생활을 실천해 주세요.
              </p>
              <button 
                onClick={() => setShowProfanityPopup(false)}
                className={cn("w-full py-3 rounded-xl font-bold transition-all transform active:scale-95", THEME.accent)}
              >
                알겠습니다.
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Spam Prevention Modal */}
      <AnimatePresence>
        {showSpamPopup && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn("max-w-sm w-full p-8 rounded-2xl shadow-2xl border text-center", THEME.card, THEME.border)}
            >
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6", theme === 'dark' ? "bg-red-500/10" : "bg-red-50")}>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold mb-4">도배 방지 시스템</h2>
              <p className={cn("text-sm leading-relaxed mb-8", THEME.textMuted)}>
                연속으로 한번에 많은 메시지를 전송하지 말아주세요.
              </p>
              <button 
                onClick={() => setShowSpamPopup(false)}
                className={cn("w-full py-3 rounded-xl font-bold transition-all transform active:scale-95", THEME.accent)}
              >
                알겠습니다.
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Welcome Popup */}
      <AnimatePresence>
        {showWelcome && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn("max-w-sm w-full p-8 rounded-2xl shadow-2xl border text-center", THEME.card, THEME.border)}
            >
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6", THEME.ghost)}>
                <Info className={cn("w-8 h-8", THEME.icon)} />
              </div>
              <h2 className="text-xl font-bold mb-4">환영합니다!</h2>
              <p className={cn("text-sm leading-relaxed mb-8", THEME.textMuted)}>
                이 채팅방은 모두가 이용할 수 있는 익명채팅방입니다.<br />
                다같이 원활한 소통 바랍니다.
              </p>
              <button 
                onClick={() => setShowWelcome(false)}
                className={cn("w-full py-3 rounded-xl font-bold transition-all transform active:scale-95", THEME.accent)}
              >
                확인
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderPollModal()}
      {renderDeleteConfirmModal()}
    </div>
  );

  return (
    <div className={cn(
      "fixed inset-0 flex items-center justify-center font-sans", 
      THEME.bg, THEME.text,
      theme === 'dark' ? "selection:bg-white selection:text-black" : "selection:bg-black selection:text-white"
    )}>
      {step === 'landing' && renderLanding()}
      {step === 'intro' && renderIntro()}
      {step === 'tos' && renderToS()}
      {step === 'nickname' && renderNicknameEntry()}
      {step === 'chat' && renderChat()}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${theme === 'dark' ? '#2a2a2a' : '#e2e8f0'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'dark' ? '#3a3a3a' : '#cbd5e1'};
        }
      `}</style>
    </div>
  );
}
