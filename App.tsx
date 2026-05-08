import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet } from 'react-native';
import { DashboardScreen } from './app/screens/DashboardScreen';
import { DataUpdateScreen } from './app/screens/DataUpdateScreen';
import { FailedQueueScreen } from './app/screens/FailedQueueScreen';
import { LoginScreen } from './app/screens/LoginScreen';
import { MessagesScreen } from './app/screens/MessagesScreen';
import { NewSaleScreen } from './app/screens/NewSaleScreen';
import { OpenDocumentsScreen } from './app/screens/OpenDocumentsScreen';
import { QRAlbumScreen } from './app/screens/QRAlbumScreen';
import { SettingsScreen } from './app/screens/SettingsScreen';
import { colors } from './app/theme';
import { HoneywellPreviewFrame } from './components/HoneywellPreviewFrame';
import { loadSession, saveSession } from './storage/localStorage';
import type { AppScreen, UserSession } from './types';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    loadSession().then((savedSession) => {
      if (savedSession) {
        setSession(savedSession);
        setScreen('dashboard');
      }
    });
  }, []);

  const handleLogin = async (nextSession: UserSession) => {
    setSession(nextSession);
    await saveSession(nextSession);
    setScreen('dashboard');
  };

  const renderScreen = () => {
    if (screen === 'login') return <LoginScreen onLogin={handleLogin} />;
    if (screen === 'newSale') return <NewSaleScreen onBack={() => setScreen('dashboard')} />;
    if (screen === 'openDocuments') return <OpenDocumentsScreen onBack={() => setScreen('dashboard')} />;
    if (screen === 'qrAlbum') return <QRAlbumScreen onBack={() => setScreen('dashboard')} />;
    if (screen === 'messages') return <MessagesScreen onBack={() => setScreen('dashboard')} />;
    if (screen === 'failedQueue') return <FailedQueueScreen onBack={() => setScreen('dashboard')} />;
    if (screen === 'dataUpdate') return <DataUpdateScreen onBack={() => setScreen('dashboard')} />;
    if (screen === 'settings') return <SettingsScreen onBack={() => setScreen('dashboard')} session={session} />;
    return <DashboardScreen session={session} onNavigate={setScreen} />;
  };

  const appContent = (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {renderScreen()}
    </SafeAreaView>
  );

  if (Platform.OS === 'web') {
    return <HoneywellPreviewFrame>{appContent}</HoneywellPreviewFrame>;
  }

  return appContent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
