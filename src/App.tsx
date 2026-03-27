import React, { useState, useEffect, useRef, Component, useMemo } from 'react';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  collection, doc, getDoc, setDoc, query, orderBy, onSnapshot, 
  serverTimestamp, increment, writeBatch, deleteDoc, User,
  handleFirestoreError, OperationType
} from './firebase';
import { Reel, UserProfile, Comment } from './types';
import { 
  Heart, MessageCircle, User as UserIcon, 
  PlusSquare, Home, Search, LogOut, Send, X, Play, Pause, AlertCircle, Info, Eye, Share2,
  Volume2, VolumeX
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Timestamp } from 'firebase/firestore';

const FAKE_REELS: Reel[] = [
  {
    id: 'fake-1',
    authorUid: 'system',
    authorName: 'Watchly Official',
    authorPhoto: 'https://picsum.photos/seed/watchly/100',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-light-dancing-40082-large.mp4',
    caption: 'Welcome to Watchly! 🚀 The future of short-form video is here. Founded by Manchala Anoop Kumar, Devasani Abhiraama, and Gandra Sanath.',
    likesCount: 12500,
    commentsCount: 450,
    viewsCount: 150000,
    createdAt: Timestamp.now()
  },
  {
    id: 'fake-2',
    authorUid: 'system',
    authorName: 'Nature Explorer',
    authorPhoto: 'https://picsum.photos/seed/nature/100',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-the-forest-2305-large.mp4',
    caption: 'Finding peace in the whispers of the forest. 🌿✨ #nature #serenity #watchly',
    likesCount: 8900,
    commentsCount: 120,
    viewsCount: 45000,
    createdAt: Timestamp.now()
  },
  {
    id: 'fake-3',
    authorUid: 'system',
    authorName: 'CyberPunk 2077',
    authorPhoto: 'https://picsum.photos/seed/cyber/100',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41131-large.mp4',
    caption: 'The digital revolution will not be televised. It will be streamed. ⚡️ #tech #future #coding',
    likesCount: 5600,
    commentsCount: 85,
    viewsCount: 32000,
    createdAt: Timestamp.now()
  },
  {
    id: 'fake-4',
    authorUid: 'system',
    authorName: 'Urban Beats',
    authorPhoto: 'https://picsum.photos/seed/urban/100',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-dancing-in-the-street-at-night-40081-large.mp4',
    caption: 'The city never sleeps, and neither do the vibes. 🏙️💃 #dance #urban #nightlife',
    likesCount: 15400,
    commentsCount: 310,
    viewsCount: 210000,
    createdAt: Timestamp.now()
  },
  {
    id: 'fake-5',
    authorUid: 'system',
    authorName: 'Gourmet Kitchen',
    authorPhoto: 'https://picsum.photos/seed/food/100',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-salad-41130-large.mp4',
    caption: 'Cooking is an art, and the kitchen is my canvas. 👨‍🍳🥗 #foodie #chef #healthy',
    likesCount: 7200,
    commentsCount: 190,
    viewsCount: 88000,
    createdAt: Timestamp.now()
  }
];

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends (Component as any) {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        errorMessage = `Firestore Error: ${parsedError.error} during ${parsedError.operationType} on ${parsedError.path}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle size={64} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
          <p className="text-gray-400 mb-6 max-w-md">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Components ---

import { GoogleGenAI } from "@google/genai";

const Navbar = ({ 
  user, onAuth, onUpload, onAbout, logoUrl, filter, setFilter 
}: { 
  user: User | null, 
  onAuth: () => void, 
  onUpload: () => void, 
  onAbout: () => void, 
  logoUrl?: string,
  filter: 'latest' | 'trending',
  setFilter: (f: 'latest' | 'trending') => void
}) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent z-50 md:top-0 md:bottom-auto md:bg-gradient-to-b md:border-b md:border-white/5 md:backdrop-blur-xl">
    <div className="max-w-screen-xl mx-auto px-6 h-20 flex items-center justify-between">
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-3 group cursor-pointer">
          {logoUrl ? (
            <img src={logoUrl} alt="Watchly Logo" className="h-10 w-10 object-contain group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Play size={20} className="text-white fill-current" />
            </div>
          )}
          <h1 className="hidden lg:block text-3xl font-display uppercase tracking-tighter text-white italic group-hover:text-blue-400 transition-colors">Watchly</h1>
        </div>

        {/* Filter Tabs */}
        <div className="hidden sm:flex items-center bg-white/5 backdrop-blur-2xl rounded-2xl p-1 border border-white/10">
          <button 
            onClick={() => setFilter('latest')}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'latest' ? 'bg-white text-black shadow-xl' : 'text-white/60 hover:text-white'}`}
          >
            Latest
          </button>
          <button 
            onClick={() => setFilter('trending')}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'trending' ? 'bg-white text-black shadow-xl' : 'text-white/60 hover:text-white'}`}
          >
            Trending
          </button>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-md mx-10">
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search creators or reels..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-6 lg:space-x-10">
        <button className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
          <Home size={28} />
        </button>
        <button onClick={onAbout} className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
          <Info size={28} />
        </button>
        <button onClick={onUpload} className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
          <PlusSquare size={28} />
        </button>
        {user ? (
          <div className="flex items-center space-x-6">
            <button className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
              <UserIcon size={28} />
            </button>
            <button onClick={() => signOut(auth)} className="p-2 text-white/60 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all">
              <LogOut size={28} />
            </button>
          </div>
        ) : (
          <button onClick={onAuth} className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 hover:scale-105 transition-all shadow-lg">
            Login
          </button>
        )}
      </div>
    </div>
  </nav>
);

const ReelCard = ({ reel, currentUser }: { reel: Reel, currentUser: User | null, key?: string }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentUser) {
      const path = `reels/${reel.id}/likes/${currentUser.uid}`;
      const likeRef = doc(db, path);
      getDoc(likeRef).then(docSnap => setIsLiked(docSnap.exists()))
        .catch(err => handleFirestoreError(err, OperationType.GET, path));
    }
  }, [reel.id, currentUser]);

  useEffect(() => {
    if (showComments) {
      const path = `reels/${reel.id}/comments`;
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, path));
    }
  }, [showComments, reel.id]);

  const handleLike = async () => {
    if (!currentUser) return;
    const likePath = `reels/${reel.id}/likes/${currentUser.uid}`;
    const reelPath = `reels/${reel.id}`;
    const likeRef = doc(db, likePath);
    const reelRef = doc(db, reelPath);
    const batch = writeBatch(db);

    try {
      if (isLiked) {
        batch.delete(likeRef);
        batch.update(reelRef, { likesCount: increment(-1) });
        setIsLiked(false);
      } else {
        batch.set(likeRef, { reelId: reel.id, userId: currentUser.uid, createdAt: serverTimestamp() });
        batch.update(reelRef, { likesCount: increment(1) });
        setIsLiked(true);
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${likePath} / ${reelPath}`);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    const commentPath = `reels/${reel.id}/comments`;
    const reelPath = `reels/${reel.id}`;
    const commentRef = doc(collection(db, commentPath));
    const reelRef = doc(db, reelPath);
    const batch = writeBatch(db);

    try {
      batch.set(commentRef, {
        reelId: reel.id,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userPhoto: currentUser.photoURL || '',
        text: newComment,
        createdAt: serverTimestamp()
      });
      batch.update(reelRef, { commentsCount: increment(1) });

      await batch.commit();
      setNewComment('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${commentPath} / ${reelPath}`);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!', {
      description: 'Share it with your friends!',
    });
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  return (
    <div className="relative h-screen w-full max-w-[450px] mx-auto bg-black snap-start flex items-center justify-center overflow-hidden group/reel">
      {!videoError ? (
        <>
          <video 
            ref={videoRef}
            src={reel.videoUrl} 
            className="h-full w-full object-cover cursor-pointer"
            loop
            autoPlay
            muted={isMuted}
            playsInline
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onWaiting={() => setIsVideoLoading(true)}
            onPlaying={() => setIsVideoLoading(false)}
            onLoadedData={() => setIsVideoLoading(false)}
            onError={() => setVideoError(true)}
          />
          {isVideoLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
        </>
      ) : (
        <div className="h-full w-full bg-zinc-900 flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle size={48} className="text-gray-600 mb-4" />
          <p className="text-gray-400 text-sm">Video could not be loaded. The source URL might be invalid or unsupported.</p>
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
        <motion.div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Sound Toggle */}
      <button 
        onClick={toggleMute}
        className="absolute top-24 right-6 p-3 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl text-white/60 hover:text-white hover:bg-black/40 transition-all z-20"
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 p-6 rounded-full">
            <Play size={48} className="text-white fill-white" />
          </div>
        </div>
      )}

      {/* Overlay Info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
      
      <div className="absolute bottom-24 left-6 right-20 text-white pointer-events-none">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center space-x-4 mb-4 pointer-events-auto"
        >
          <div className="relative group">
            <img 
              src={reel.authorPhoto || 'https://picsum.photos/seed/user/100'} 
              className="w-14 h-14 rounded-2xl border-2 border-white/20 shadow-2xl group-hover:scale-110 transition-transform duration-500" 
              alt="" 
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-black flex items-center justify-center shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">{reel.authorName || 'User'}</span>
            <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-md">Verified Creator</span>
          </div>
          <button className="ml-2 px-5 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/20 hover:scale-105 transition-all active:scale-95">Follow</button>
        </motion.div>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-base font-medium leading-relaxed drop-shadow-xl line-clamp-3 max-w-[90%] text-white/90"
        >
          {reel.caption}
        </motion.p>
      </div>

      {/* Side Actions */}
      <div className="absolute bottom-32 right-6 flex flex-col items-center space-y-8 text-white z-10">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="flex flex-col items-center group cursor-pointer">
          <div className="p-4 bg-white/5 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 group-hover:border-white/30 group-hover:bg-white/10 transition-all shadow-2xl">
            <Eye size={30} className="text-white/80 group-hover:text-white" />
          </div>
          <span className="text-[11px] font-black mt-2 tracking-tighter drop-shadow-md">{(reel.viewsCount || 0).toLocaleString()}</span>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="flex flex-col items-center group cursor-pointer">
          <button onClick={handleLike} className="p-4 bg-white/5 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 group-hover:border-white/30 group-hover:bg-white/10 transition-all shadow-2xl">
            <Heart size={30} className={isLiked ? "text-red-500 fill-red-500" : "text-white/80 group-hover:text-white"} />
          </button>
          <span className="text-[11px] font-black mt-2 tracking-tighter drop-shadow-md">{reel.likesCount.toLocaleString()}</span>
        </motion.div>

        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="flex flex-col items-center group cursor-pointer">
          <button onClick={() => setShowComments(true)} className="p-4 bg-white/5 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 group-hover:border-white/30 group-hover:bg-white/10 transition-all shadow-2xl">
            <MessageCircle size={30} className="text-white/80 group-hover:text-white" />
          </button>
          <span className="text-[11px] font-black mt-2 tracking-tighter drop-shadow-md">{reel.commentsCount.toLocaleString()}</span>
        </motion.div>

        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="flex flex-col items-center group cursor-pointer">
          <button onClick={handleShare} className="p-4 bg-white/5 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 group-hover:border-white/30 group-hover:bg-white/10 transition-all shadow-2xl">
            <Share2 size={30} className="text-white/80 group-hover:text-white" />
          </button>
          <span className="text-[11px] font-black mt-2 tracking-widest uppercase drop-shadow-md">Share</span>
        </motion.div>
      </div>

      {/* Comments Modal */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute inset-0 bg-black/90 z-50 flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold">Comments</h3>
              <button onClick={() => setShowComments(false)} className="text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex space-x-3">
                  <img src={comment.userPhoto || 'https://picsum.photos/seed/user/100'} className="w-8 h-8 rounded-full" alt="" />
                  <div>
                    <p className="text-white text-sm"><span className="font-bold mr-2">{comment.userName}</span>{comment.text}</p>
                    <span className="text-gray-500 text-xs">Just now</span>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleComment} className="p-4 border-t border-white/10 flex items-center space-x-3">
              <input 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-white/10 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
              />
              <button type="submit" className="text-white">
                <Send size={20} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const UploadModal = ({ isOpen, onClose, onUpload }: { isOpen: boolean, onClose: () => void, onUpload: (data: any) => void }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl || !caption) return;
    onUpload({ videoUrl, caption });
    setVideoUrl('');
    setCaption('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl overflow-hidden border border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white font-bold">Create New Reel</h2>
          <button onClick={onClose} className="text-white"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Video URL</label>
            <input 
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30"
            />
            <p className="text-[10px] text-gray-500 mt-1">Use direct links to .mp4 files (e.g. from Mixkit or Pexels)</p>
          </div>
          <div>
            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Caption</label>
            <textarea 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white h-32 resize-none focus:outline-none focus:border-white/30"
            />
          </div>
          <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors">
            Share Reel
          </button>
        </form>
      </div>
    </div>
  );
};

const AboutModal = ({ isOpen, onClose, onInstall, canInstall }: { isOpen: boolean, onClose: () => void, onInstall: () => void, canInstall: boolean }) => {
  if (!isOpen) return null;

  const team = [
    { name: "Manchala Anoop Kumar", role: "CEO & Founder", image: "https://picsum.photos/seed/anoop/400", bio: "Visionary leader driving the future of social media." },
    { name: "Devasani Abhiraama", role: "Co-founder & MD", image: "https://picsum.photos/seed/abhiraama/400", bio: "Strategic mastermind behind Watchly's global growth." },
    { name: "Gandra Sanath", role: "Chairperson & CFO", image: "https://picsum.photos/seed/sanath/400", bio: "Financial architect ensuring sustainable innovation." }
  ];

  return (
    <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-zinc-900 w-full max-w-2xl rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row h-[80vh] md:h-auto"
      >
        <div className="md:w-1/3 bg-gradient-to-br from-blue-600 to-purple-700 p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-4xl font-display uppercase leading-none mb-2">Watchly</h2>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Executive Board</p>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-medium leading-relaxed text-white/80 italic">
              "Empowering creators to share their world, one reel at a time."
            </p>
            <div className="h-1 w-12 bg-white/30 rounded-full" />
          </div>
        </div>

        <div className="flex-1 p-8 md:p-12 space-y-10 overflow-y-auto bg-zinc-900">
          <div className="space-y-8">
            <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">The Leadership</h3>
            <div className="grid gap-8">
              {team.map((member, index) => (
                <motion.div 
                  key={index}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-6 group"
                >
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/5 group-hover:border-blue-500/50 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1">
                    <h3 className="text-white text-lg font-bold group-hover:text-blue-400 transition-colors">{member.name}</h3>
                    <p className="text-blue-500/80 text-[10px] font-bold uppercase tracking-wider">{member.role}</p>
                    <p className="text-gray-500 text-xs leading-relaxed">{member.bio}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 space-y-4">
            <button 
              onClick={onInstall}
              className="w-full py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center space-x-3 hover:bg-blue-50 transition-all active:scale-95 shadow-xl shadow-white/5"
            >
              <PlusSquare size={20} />
              <span>{canInstall ? 'Install Watchly App' : 'How to Download'}</span>
            </button>
            <p className="text-gray-600 text-[10px] text-center font-medium">
              Experience Watchly in full-screen glory on your mobile device.
            </p>
          </div>
        </div>
        
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/40 hover:text-white transition-all"
        >
          <X size={20} />
        </button>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [reels, setReels] = useState<Reel[]>(FAKE_REELS);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('To install Watchly on your phone:\n\n1. Open this link in Safari (iOS) or Chrome (Android)\n2. Tap "Share" or the three dots menu\n3. Select "Add to Home Screen"');
    }
  };
  const [isLoading, setIsLoading] = useState(true);

  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const generateLogo = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                text: 'A modern, minimalist, and attractive logo for a video sharing app named "Watchly". The logo should feature a stylized play button or a sleek eye icon. Use a vibrant color palette with electric blue and deep black. Professional vector style, high quality, isolated on black background.',
              },
            ],
          },
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            setLogoUrl(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      } catch (error) {
        console.error('Error generating logo:', error);
      }
    };

    generateLogo();
  }, []);

  const [filter, setFilter] = useState<'latest' | 'trending'>('latest');

  const sortedReels = useMemo(() => {
    const sorted = [...reels];
    if (filter === 'trending') {
      return sorted.sort((a, b) => {
        const scoreA = (a.likesCount * 2) + (a.viewsCount || 0);
        const scoreB = (b.likesCount * 2) + (b.viewsCount || 0);
        return scoreB - scoreA;
      });
    }
    // Default: latest (by createdAt)
    return sorted.sort((a, b) => {
      const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : (a.createdAt as any)?.seconds * 1000 || 0;
      const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : (b.createdAt as any)?.seconds * 1000 || 0;
      return timeB - timeA;
    });
  }, [reels, filter]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Create user profile if it doesn't exist
        const path = `users/${u.uid}`;
        const userRef = doc(db, path);
        getDoc(userRef).then(docSnap => {
          if (!docSnap.exists()) {
            setDoc(userRef, {
              uid: u.uid,
              displayName: u.displayName || 'Anonymous',
              photoURL: u.photoURL || '',
              followersCount: 0,
              followingCount: 0
            }).catch(err => handleFirestoreError(err, OperationType.CREATE, path));
          }
        }).catch(err => handleFirestoreError(err, OperationType.GET, path));
      }
      setIsLoading(false);
    });

    // Safety timeout for loading screen
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const path = 'reels';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reel));
      setReels([...dbReels, ...FAKE_REELS]);
    }, (err) => {
      // If user is not logged in, they might get a permission error on the 'reels' collection
      // depending on firestore.rules. We should still show FAKE_REELS.
      setReels(FAKE_REELS);
      console.warn("Firestore reels fetch failed (likely permissions), showing fake reels only.");
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleUpload = async (data: { videoUrl: string, caption: string }) => {
    if (!user) return;
    const path = 'reels';
    try {
      const reelRef = doc(collection(db, path));
      await setDoc(reelRef, {
        authorUid: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        videoUrl: data.videoUrl,
        caption: data.caption,
        likesCount: 0,
        commentsCount: 0,
        viewsCount: Math.floor(Math.random() * 500) + 100, // Initial fake views
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-purple-900/20" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
          className="relative z-10"
        >
          <div className="h-24 w-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)] mb-8">
            <Play size={48} className="text-white fill-current" />
          </div>
        </motion.div>
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-5xl font-display uppercase italic tracking-tighter text-white z-10"
        >
          Watchly
        </motion.div>
        <div className="mt-4 h-1 w-48 bg-white/10 rounded-full overflow-hidden z-10">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="h-full w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
          />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-center" theme="dark" richColors />
      <div className="mesh-bg min-h-screen text-white font-sans selection:bg-blue-500/30">
        <Navbar 
          user={user} 
          onAuth={handleLogin} 
          onUpload={() => setIsUploadOpen(true)} 
          onAbout={() => setIsAboutOpen(true)} 
          logoUrl={logoUrl} 
          filter={filter}
          setFilter={setFilter}
        />
        
        <div className="fixed top-20 left-0 right-0 z-40 pointer-events-none overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 mx-12">
                Trending Now • Watchly Originals • Join the Movement •
              </span>
            ))}
          </div>
        </div>

        <main className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
          {sortedReels.length > 0 ? (
            sortedReels.map(reel => (
              <ReelCard key={reel.id} reel={reel} currentUser={user} />
            ))
          ) : (
            <div className="h-screen flex flex-col items-center justify-center text-white p-8 text-center bg-black">
              <PlusSquare size={64} className="mb-4 opacity-20" />
              <h2 className="text-xl font-bold mb-2">No Reels Yet</h2>
              <p className="text-gray-500 max-w-xs">Be the first to share a moment with the world!</p>
              {!user && (
                <button onClick={handleLogin} className="mt-6 px-6 py-2 bg-white text-black font-bold rounded-lg">
                  Login to Post
                </button>
              )}
            </div>
          )}
        </main>

        <AboutModal 
          isOpen={isAboutOpen} 
          onClose={() => setIsAboutOpen(false)} 
          onInstall={handleInstall}
          canInstall={!!deferredPrompt}
        />

        <UploadModal 
          isOpen={isUploadOpen} 
          onClose={() => setIsUploadOpen(false)} 
          onUpload={handleUpload} 
        />
      </div>
    </ErrorBoundary>
  );
}
