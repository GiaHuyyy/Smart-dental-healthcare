import { useAuth } from '@/contexts/auth-context';
import { Redirect } from 'expo-router';

export default function Index() {
  const { session, isHydrating } = useAuth();

  // Wait for session to load
  if (isHydrating) {
    return null;
  }

  // If user is logged in, redirect to appropriate dashboard
  if (session?.token) {
    if (session.user.role === 'doctor') {
      return <Redirect href="/(doctor)/appointments" />;
    }
    return <Redirect href="/(tabs)/appointments" />;
  }

  // If not logged in, redirect to login
  return <Redirect href="/(auth)/login" />;
}
