'use client';

import Map from '../components/Map';
import Sidebar from '../components/Sidebar';
import ClientOnly from '../components/ClientOnly';
import LoginScreen from '../components/LoginScreen';
import { MapProvider, useMap } from '../context/MapContext';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';

// Component for authenticated content with loading indicator
function MapContent() {
  const { isLoading } = useMap();
  
  return (
    <>
      <LoadingOverlay isVisible={isLoading} />
      <div className="flex flex-col md:flex-row w-full h-screen">
        <div className="w-full md:w-80 h-80 md:h-full overflow-hidden flex-shrink-0 border-r">
          <Sidebar />
        </div>
        <div className="flex-grow h-[calc(100vh-20rem)] md:h-full">
          <Map />
        </div>
      </div>
    </>
  );
}

function AppContent() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <MapProvider>
      <MapContent />
    </MapProvider>
  );
}

export default function Home() {
  return (
    <ClientOnly>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ClientOnly>
  );
}
