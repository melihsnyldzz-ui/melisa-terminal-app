import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardScreen } from './app/screens/DashboardScreen';
import { DataUpdateScreen } from './app/screens/DataUpdateScreen';
import { AuditLogScreen } from './app/screens/AuditLogScreen';
import { CurrencySettingsScreen } from './app/screens/CurrencySettingsScreen';
import { FailedQueueScreen } from './app/screens/FailedQueueScreen';
import { LoginScreen } from './app/screens/LoginScreen';
import { MessagesScreen } from './app/screens/MessagesScreen';
import { NewSaleScreen } from './app/screens/NewSaleScreen';
import { OpenSaleDraftsScreen } from './app/screens/OpenSaleDraftsScreen';
import { OpenDocumentsScreen } from './app/screens/OpenDocumentsScreen';
import { PickingScreen } from './app/screens/PickingScreen';
import { PersonnelSelectScreen } from './app/screens/PersonnelSelectScreen';
import { PrintQueueScreen } from './app/screens/PrintQueueScreen';
import { QRAlbumScreen } from './app/screens/QRAlbumScreen';
import { SaleReviewScreen } from './app/screens/SaleReviewScreen';
import { SalesCustomerScreen } from './app/screens/SalesCustomerScreen';
import { SettingsScreen } from './app/screens/SettingsScreen';
import { TerminalSettingsScreen } from './app/screens/TerminalSettingsScreen';
import { UnauthorizedScreen } from './app/screens/UnauthorizedScreen';
import { colors } from './app/theme';
import { canOpenScreen, screenPermissions } from './app/utils/permissionUtils';
import { HoneywellPreviewFrame } from './components/HoneywellPreviewFrame';
import { ScreenErrorBoundary } from './components/ScreenErrorBoundary';
import { checkLocalPriceService } from './services/api';
import { addAuditLog, clearCurrentUser, clearSession, loadCurrentUser, loadSession, loadSettings, loadTerminalDeviceSettings, saveCurrentUser, saveSession } from './storage/localStorage';
import type { AppScreen, PersonnelUser, UserSession } from './types';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('personnelSelect');
  const [session, setSession] = useState<UserSession | null>(null);
  const [currentUser, setCurrentUser] = useState<PersonnelUser | null>(null);
  const [backHint, setBackHint] = useState('');
  const lastBackPressRef = useRef(0);
  const backHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([loadSession(), loadCurrentUser()]).then(([savedSession, savedUser]) => {
      if (savedSession && savedUser) {
        setSession(savedSession);
        setCurrentUser(savedUser);
        setScreen('dashboard');
      }
    });
  }, []);

  useEffect(() => {
    loadSettings().then(async (settings) => {
      if (settings.apiMode === 'mock') return;
      const result = await checkLocalPriceService(settings);
      if (!result.ok && settings.apiMode === 'real') {
        setBackHint(`${result.message}. Ayarlar > Local fiyat servisi adresi: ${result.url}. ${result.reason || ''}`.trim());
      }
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen !== 'dashboard' && screen !== 'login') {
        setScreen('dashboard');
        setBackHint('');
        return true;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressRef.current = now;
      setBackHint('Çıkmak için tekrar geri tuşuna basın');
      if (backHintTimerRef.current) clearTimeout(backHintTimerRef.current);
      backHintTimerRef.current = setTimeout(() => setBackHint(''), 2000);
      return true;
    });

    return () => {
      subscription.remove();
      if (backHintTimerRef.current) clearTimeout(backHintTimerRef.current);
    };
  }, [screen]);

  const handleLogin = async (nextSession: UserSession) => {
    setSession(nextSession);
    await saveSession(nextSession);
    setBackHint('');
    setScreen('dashboard');
  };

  const handlePersonnelSelect = async (user: PersonnelUser) => {
    const [settings, terminalSettings] = await Promise.all([loadSettings(), loadTerminalDeviceSettings()]);
    const nextSession: UserSession = {
      username: user.name,
      branch: terminalSettings.branchName || settings.branch,
      terminalId: terminalSettings.deviceName || settings.terminalId,
      offlineMode: true,
    };
    setCurrentUser(user);
    setSession(nextSession);
    await saveCurrentUser(user);
    await saveSession(nextSession);
    setBackHint('');
    setScreen('dashboard');
  };

  const navigateTo = (nextScreen: AppScreen) => {
    setBackHint('');
    if (!canOpenScreen(currentUser, nextScreen)) {
      const permission = screenPermissions[nextScreen];
      void addAuditLog({
        operationType: 'Yetkisiz erişim denemesi',
        description: `${currentUser?.code || 'Bilinmeyen'} ${nextScreen} ekranına erişmek istedi${permission ? ` (${permission})` : ''}.`,
        status: 'warning',
      });
      setBackHint('Bu işlem için yetkiniz yok');
      setScreen('unauthorized');
      return;
    }
    setScreen(nextScreen);
  };

  const recoverToDashboard = () => {
    setBackHint('Ekran güvenli moda alındı. Gerekirse Ayarlar > Aktif Taslağı Sıfırla yap.');
    setScreen(session && currentUser ? 'dashboard' : 'personnelSelect');
  };

  const handleLogout = async () => {
    await clearSession();
    await clearCurrentUser();
    setSession(null);
    setCurrentUser(null);
    setBackHint('');
    setScreen('personnelSelect');
  };

  const renderScreen = () => {
    if (screen === 'personnelSelect') return <PersonnelSelectScreen onSelect={handlePersonnelSelect} systemMessage={backHint} />;
    if (screen === 'unauthorized') return <UnauthorizedScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'login') return <LoginScreen onLogin={handleLogin} systemMessage={backHint} />;
    if (screen === 'salesCustomer') return <SalesCustomerScreen onBack={() => navigateTo('dashboard')} onNavigate={navigateTo} />;
    if (screen === 'newSale') return <NewSaleScreen onBack={() => navigateTo('salesCustomer')} onNavigate={navigateTo} />;
    if (screen === 'saleReview') return <SaleReviewScreen onBack={() => navigateTo('newSale')} onDone={() => navigateTo('dashboard')} />;
    if (screen === 'openSaleDrafts') return <OpenSaleDraftsScreen onBack={() => navigateTo('dashboard')} onNavigate={navigateTo} />;
    if (screen === 'picking') return <PickingScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'openDocuments') return <OpenDocumentsScreen onBack={() => navigateTo('dashboard')} onNavigate={navigateTo} />;
    if (screen === 'qrAlbum') return <QRAlbumScreen onBack={() => navigateTo('dashboard')} onNavigate={navigateTo} />;
    if (screen === 'messages') return <MessagesScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'failedQueue') return <FailedQueueScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'printQueue') return <PrintQueueScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'dataUpdate') return <DataUpdateScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'auditLog') return <AuditLogScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'currencySettings') return <CurrencySettingsScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'terminalSettings') return <TerminalSettingsScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'settings') return <SettingsScreen onBack={() => navigateTo('dashboard')} onLogout={handleLogout} session={session} />;
    return <DashboardScreen session={session} currentUser={currentUser} onNavigate={navigateTo} systemMessage={backHint} />;
  };

  const appContent = (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor={colors.anthracite} />
        <ScreenErrorBoundary screenName={screen} onRecover={recoverToDashboard}>
          {renderScreen()}
        </ScreenErrorBoundary>
      </View>
    </SafeAreaProvider>
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
