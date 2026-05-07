import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { loginMock } from '../../services/api';
import type { UserSession } from '../../types';
import { colors } from '../theme';

const branches = ['Merkez Depo', 'Mağaza', 'Sevkiyat'];

type LoginScreenProps = {
  onLogin: (session: UserSession) => void;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [branch, setBranch] = useState(branches[0]);

  const submit = async (offlineMode: boolean) => {
    const session = await loginMock(username || 'Personel', branch, offlineMode);
    onLogin(session);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>MELİSA BEBE</Text>
        <Text style={styles.subtitle}>El Terminali</Text>
        <Text style={styles.version}>Versiyon: v0.1.0</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Kullanıcı adı</Text>
        <TextInput value={username} onChangeText={setUsername} placeholder="Personel adı" placeholderTextColor={colors.gray} style={styles.input} autoCapitalize="none" />
        <Text style={styles.label}>PIN</Text>
        <TextInput value={pin} onChangeText={setPin} placeholder="4 haneli PIN" placeholderTextColor={colors.gray} style={styles.input} secureTextEntry keyboardType="number-pad" />
        <Text style={styles.label}>Şube / depo</Text>
        <View style={styles.branchGrid}>
          {branches.map((item) => (
            <AppButton key={item} label={item} onPress={() => setBranch(item)} variant={branch === item ? 'primary' : 'secondary'} />
          ))}
        </View>
        <AppButton label="Giriş Yap" onPress={() => submit(false)} />
        <AppButton label="Çevrimdışı Devam Et" onPress={() => submit(true)} variant="dark" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: { paddingHorizontal: 22, paddingTop: 34, paddingBottom: 22, backgroundColor: colors.red },
  brand: { color: colors.white, fontSize: 34, fontWeight: '900' },
  subtitle: { color: colors.white, fontSize: 22, fontWeight: '800', marginTop: 4 },
  version: { color: colors.white, fontSize: 14, fontWeight: '700', marginTop: 12 },
  form: { padding: 16, gap: 12 },
  label: { color: colors.white, fontSize: 16, fontWeight: '800' },
  input: { minHeight: 58, borderRadius: 8, backgroundColor: colors.white, color: colors.black, fontSize: 18, paddingHorizontal: 14, fontWeight: '700' },
  branchGrid: { gap: 10 },
});
