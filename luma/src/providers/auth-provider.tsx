import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, isLoading: true });

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ session: null, isLoading: true });

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setState({ session: data.session, isLoading: false });
      })
      .catch(() => {
        if (active) setState({ session: null, isLoading: false });
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ session, isLoading: false });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
