import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import type { PersonnelUser } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type PilotGuideScreenProps = {
  onBack: () => void;
  currentUser: PersonnelUser | null;
};

const guideSections = [
  {
    title: 'Satış nasıl yapılır?',
    lines: [
      'Ana ekranda SATIŞ butonuna bas.',
      'Müşteriyi seç, fiş otomatik hazırlanır.',
      'Barkodu okut, ürünü ve fiyatı ekranda kontrol et.',
      'Fiş tamamlanınca onay ekranından yazdırma kuyruğuna gönder.',
    ],
  },
  {
    title: 'Hızlı satış modu nasıl çalışır?',
    lines: [
      'Hızlı mod açıksa barkod okutulan ürün adet 1 ile fişe düşer.',
      'Ekranda ürün adı ve fiyat kısa süre görünür.',
      'Yanlış ürün gelirse fiş satırından kontrol edip satırı silebilirsin.',
    ],
  },
  {
    title: 'Ürün bulunamazsa ne yapılır?',
    lines: [
      'Ekranda “Ürün bulunamadı.” yazarsa barkodu tekrar okut.',
      'Barkod etiketi okunmuyorsa ürün kodunu kontrol et.',
      'Fiyat alınamadı uyarısı varsa admin bağlantı ve fiyat servisini kontrol etmeli.',
    ],
  },
  {
    title: 'Yazdırma hatası olursa ne yapılır?',
    lines: [
      'Yazdırma Kuyruğu ekranına gir.',
      'Yazdırma bilgisayarı bağlı mı kontrol et.',
      'Hata alan fişi seçip tekrar yazdırmayı dene.',
      'Bilgisayar kapalıysa fiş kaybolmaz, kuyrukta bekler.',
    ],
  },
  {
    title: 'Bağlantı testi nereden yapılır?',
    lines: [
      'Ana ekrandan AYARLAR bölümüne gir.',
      'Bağlantı Testi alanında “Bağlantıyı Test Et” butonuna bas.',
      'Fiyat sistemi ve yazdırma bilgisayarı ayrı ayrı görünür.',
    ],
  },
  {
    title: 'Gün sonunda admin neye bakar?',
    lines: [
      'Pilot Kapanış ekranında açık fiş, yazdırma ve offline durumunu kontrol eder.',
      'Pilot Hataları ve Pilot Raporu ekranlarında günün sorunlarını görür.',
      'Pilot Geri Bildirim ekranında personel notlarını okur.',
    ],
  },
];

export function PilotGuideScreen({ onBack, currentUser }: PilotGuideScreenProps) {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <ScreenShell title="Kullanım Rehberi" subtitle="Pilot saha kısa anlatım" onBack={onBack}>
      <View style={styles.heroBox}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.kicker}>HIZLI YARDIM</Text>
          <Text style={styles.heroTitle}>Satışta takılırsan önce bu ekrana bak.</Text>
          <Text style={styles.heroText}>Kısa adımlar personel kullanımı için yazıldı.</Text>
        </View>
        <StatusPill label={currentUser?.role ? currentUser.role.toUpperCase() : 'PERSONEL'} tone="info" />
      </View>

      <ScrollView style={styles.guideList} nestedScrollEnabled>
        {guideSections.map((section, index) => (
          <View key={section.title} style={styles.guideCard}>
            <View style={styles.cardHeader}>
              <View style={styles.numberBox}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            <View style={styles.lineList}>
              {section.lines.map((line) => (
                <Text key={line} style={styles.guideLine}>• {line}</Text>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {isAdmin ? (
        <View style={styles.adminBox}>
          <Text style={styles.adminTitle}>Admin notu</Text>
          <Text style={styles.adminText}>Pilot sonunda Pilot Kapanış, Pilot Raporu ve Performans Testi ekranlarını kontrol et. Kritik ayarları sadece admin değiştirsin.</Text>
        </View>
      ) : (
        <View style={styles.staffBox}>
          <Text style={styles.staffTitle}>Personel notu</Text>
          <Text style={styles.staffText}>Sorun yaşarsan Pilot Geri Bildirim ekranına kısa not bırak. Fiş ve kuyruk kayıtları cihazda korunur.</Text>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.line,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroTextBlock: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  heroTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  heroText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  guideList: { maxHeight: 520 },
  guideCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  numberBox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.surface, fontSize: typography.small, fontWeight: '900' },
  cardTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900', flex: 1 },
  lineList: { gap: 3 },
  guideLine: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  adminBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#efd5a7',
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    padding: spacing.sm,
    gap: 2,
  },
  adminTitle: { color: colors.amber, fontSize: typography.body, fontWeight: '900' },
  adminText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  staffBox: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#bce7c8',
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    padding: spacing.sm,
    gap: 2,
  },
  staffTitle: { color: colors.success, fontSize: typography.body, fontWeight: '900' },
  staffText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
});
