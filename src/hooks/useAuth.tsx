import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

// Extend the User type to include our custom 'roles' array
export interface UserWithRoles extends User {
  roles: string[];
}

interface AuthContextType {
    session: Session | null;
    user: UserWithRoles | null;
    signOut: () => void;
    isLoading: boolean;
    // Helper function to easily check roles
    hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<UserWithRoles | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch session on initial load. This is fast due to caching.
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            // If there's no session, we're done loading.
            // If there IS a session, the onAuthStateChange listener below will be triggered
            // and will handle setting the user and the final loading state.
            if (!session) {
                setIsLoading(false);
            }
        });

        // Listen for auth state changes (SIGNED_IN, SIGNED_OUT, etc.)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Set loading to true whenever an auth event happens.
                setIsLoading(true);
                setSession(session);

                if (session?.user) {
                    try {
                        // If there's a user, fetch their roles.
                        const { data: roles, error: rolesError } = await supabase
                            .from('user_roles')
                            .select('role')
                            .eq('user_id', session.user.id);

                        if (rolesError) {
                            console.error("Error fetching user roles:", rolesError);
                            // If user has no roles, assign 'user' role by default
                            const { error: insertError } = await supabase
                                .from('user_roles')
                                .insert({ user_id: session.user.id, role: 'user' });
                            
                            if (insertError) {
                                console.error("Error creating user role:", insertError);
                            }
                            
                            setUser({ ...session.user, roles: ['user'] });
                        } else {
                            const userRoles = roles?.map(r => r.role) || ['user'];
                            setUser({ ...session.user, roles: userRoles });
                        }
                    } catch (error) {
                        console.error("Error in auth flow:", error);
                        // In case of error, still set the user with default 'user' role.
                        setUser({ ...session.user, roles: ['user'] });
                    } finally {
                        // ALWAYS set loading to false after we're done.
                        setIsLoading(false);
                    }
                } else {
                    // If there's no session, the user is null and we are done loading.
                    setUser(null);
                    setIsLoading(false);
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        // The onAuthStateChange listener will handle setting user to null.
    };

    const hasRole = (role: string) => {
        return user?.roles.includes(role) ?? false;
    };

    return (
        <AuthContext.Provider value={{ session, user, signOut, isLoading, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
