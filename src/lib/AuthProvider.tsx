import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    role: string | null;
    isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) fetchUserRole(session.user);
            else setIsLoading(false);
        });

        // Listen to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchUserRole(session.user);
                } else {
                    setRole(null);
                    setIsLoading(false);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchUserRole = async (userObj: User) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userObj.id)
                .single();

            if (data && !error && data.role) {
                setRole(data.role);
            } else if (userObj.user_metadata?.role) {
                // Fallback to metadata if DB lookup fails (solves registration race condition)
                setRole(userObj.user_metadata.role);
            } else {
                setRole('candidate'); // Default fallback
            }
        } catch (err) {
            console.warn('Error fetching role:', err);
            // Another fallback check
            if (userObj.user_metadata?.role) {
                setRole(userObj.user_metadata.role);
            } else {
                setRole('candidate');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, role, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
