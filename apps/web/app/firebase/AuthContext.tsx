"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./config";
import { handleFirestoreError, OperationType } from "./errors";

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  role: "MANUFACTURER" | "CONSUMER" | "AUDITOR";
  organizationName?: string;
  createdAt: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    pass: string,
    displayName: string,
    role: "MANUFACTURER" | "CONSUMER" | "AUDITOR",
    orgName?: string
  ) => Promise<void>;
  signInWithGoogle: (preferredRole?: "MANUFACTURER" | "CONSUMER") => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
    const userDocPath = `users/${firebaseUser.uid}`;
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        return data;
      } else {
        // Create initial default profile if signed in via Google or third-party
        const newProfile: UserProfile = {
          userId: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Authorized User",
          role: "CONSUMER",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
        return newProfile;
      }
    } catch (err) {
      console.warn("Could not retrieve user profile from Firestore:", err);
      // Fallback in-memory profile so user is not blocked
      const fallbackProfile: UserProfile = {
        userId: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || "User",
        role: "CONSUMER",
        createdAt: new Date().toISOString()
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await fetchProfile(cred.user);
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    displayName: string,
    role: "MANUFACTURER" | "CONSUMER" | "AUDITOR",
    orgName?: string
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }

    const newProfile: UserProfile = {
      userId: cred.user.uid,
      email: cred.user.email || email.trim(),
      displayName: displayName.trim() || cred.user.email?.split("@")[0] || "User",
      role,
      organizationName: orgName?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const userDocPath = `users/${cred.user.uid}`;
    try {
      await setDoc(doc(db, "users", cred.user.uid), newProfile);
      setProfile(newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, userDocPath);
    }
  };

  const signInWithGoogle = async (preferredRole: "MANUFACTURER" | "CONSUMER" = "CONSUMER") => {
    const cred = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, "users", cred.user.uid);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        const newProfile: UserProfile = {
          userId: cred.user.uid,
          email: cred.user.email || "",
          displayName: cred.user.displayName || "Google User",
          role: preferredRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      }
    } catch (err) {
      console.warn("Error creating/fetching Google user profile:", err);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const signOutUser = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        sendPasswordReset,
        signOutUser,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
