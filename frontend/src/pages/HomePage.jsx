import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import ErrorBoundary from "../components/ErrorBoundary";
import HomeDashboard from "../components/home/HomeDashboard";
import HomeLanding from "../components/home/HomeLanding";

/**
 * The home route is one surface with two faces: a landing page for visitors and
 * a personalized dashboard for signed-in students, built from their own saved
 * generations, chat sessions, documents and token usage.
 */
export default function HomePage() {
  const { user, loading } = useAuth();

  // While a stored session is still being restored, show the shell rather than
  // flashing a signed-out landing page at someone who is signed in.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!user) return <HomeLanding />;

  return (
    <Layout>
      <ErrorBoundary>
        <HomeDashboard />
      </ErrorBoundary>
    </Layout>
  );
}
