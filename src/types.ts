import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
}

export interface Reel {
  id: string;
  authorUid: string;
  authorName?: string;
  authorPhoto?: string;
  videoUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  createdAt: Timestamp;
}

export interface Comment {
  id: string;
  reelId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: Timestamp;
}

export interface Like {
  reelId: string;
  userId: string;
  createdAt: Timestamp;
}
