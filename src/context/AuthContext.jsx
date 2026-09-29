import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../utils/firebase/config";
import { getUserProfile, onAuthChange } from "../utils/firebase/auth";
import { getMembership, getOrganization } from "../utils/firebase/organizations";

const AuthContext = createContext(null);

async function loadOrgData(firebaseUser) {
  if (!firebaseUser || firebaseUser.isAnonymous) {
    return { profile: null, organization: null, membership: null };
  }

  const profile = await getUserProfile(firebaseUser.uid);
  if (!profile?.orgId) {
    return { profile, organization: null, membership: null };
  }

  const [organization, membership] = await Promise.all([
    getOrganization(profile.orgId),
    getMembership(profile.orgId, firebaseUser.uid),
  ]);
  return { profile, organization, membership };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(true);
      try {
        const data = await loadOrgData(firebaseUser);
        setProfile(data.profile);
        setOrganization(data.organization);
        setMembership(data.membership);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Sign-up writes the organization/membership/user-profile docs AFTER the auth account is
  // created, which fires the listener above immediately -- before those writes land. Callers
  // that just performed such writes (see SignupForm) must await this to force a fresh read
  // once their writes are guaranteed complete, rather than trusting the listener's first pass.
  async function refresh() {
    setLoading(true);
    try {
      const data = await loadOrgData(auth.currentUser);
      setProfile(data.profile);
      setOrganization(data.organization);
      setMembership(data.membership);
    } finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    profile,
    organization,
    membership,
    loading,
    isOrganizer: Boolean(user && !user.isAnonymous && organization),
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
