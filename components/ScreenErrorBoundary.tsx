import { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../app/theme';
import { addAuditLog } from '../storage/localStorage';

type ScreenErrorBoundaryProps = {
  children: ReactNode;
  screenName: string;
  onRecover: () => void;
};

type ScreenErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class ScreenErrorBoundary extends Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
  state: ScreenErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ScreenErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ekran beklenmeyen bir hata verdi.',
    };
  }

  componentDidCatch(error: Error) {
    console.warn('Screen error:', this.props.screenName, error.message);
    void addAuditLog({
      operationType: 'Hata oluştu',
      description: `${this.props.screenName}: ${error.message || 'Ekran beklenmeyen bir hata verdi.'}`,
      status: 'error',
    });
  }

  componentDidUpdate(previousProps: ScreenErrorBoundaryProps) {
    if (previousProps.screenName !== this.props.screenName && this.state.hasError) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.badge}>Ekran hatası</Text>
          <Text style={styles.title}>{this.props.screenName} açılamadı</Text>
          <Text style={styles.text}>Bu ekran beklenmeyen bir hata verdi. Uygulama tamamen beyaz ekranda kalmasın diye güvenli moda alındı.</Text>
          <Text style={styles.errorText} numberOfLines={3}>{this.state.message}</Text>
          <Pressable onPress={this.props.onRecover} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Dashboard'a Dön</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.md,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.red,
    color: colors.surface,
    borderRadius: radius.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: typography.small,
    fontWeight: '900',
  },
  title: {
    color: colors.ink,
    fontSize: typography.section,
    fontWeight: '900',
  },
  text: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    lineHeight: 18,
  },
  errorText: {
    color: colors.muted,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: typography.small,
    fontWeight: '800',
  },
  button: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.86,
  },
});
