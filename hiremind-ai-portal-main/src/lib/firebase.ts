import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD-uYpLRGUkdJhgw1llPCw7hHGBoBhZlBQ",
  authDomain: "librarymanagement-86da3.firebaseapp.com",
  databaseURL: "https://librarymanagement-86da3-default-rtdb.firebaseio.com",
  projectId: "librarymanagement-86da3",
  storageBucket: "librarymanagement-86da3.firebasestorage.app",
  messagingSenderId: "27028197198",
  appId: "1:27028197198:web:29f93a801e23d44951581f",
  measurementId: "G-F22GD3LRZ0",
};

export const ADMIN_EMAIL = "prathmeshbobade33@gmail.com";

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getDatabase(firebaseApp);
export const storage = getStorage(firebaseApp);

export type Job = {
  id: string;
  companyName: string;
  companyLogo?: string;
  role: string;
  salary: string;
  category: string;          // <-- Add
  
  location: string;
  experience: string;
  skills: string;
  jobType: string;
  description: string;
  applyLink: string;
  lastDate: string;
  createdAt: number;
  updatedAt: number;
};