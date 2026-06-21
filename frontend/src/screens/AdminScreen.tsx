import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { FButton, FCard } from '../components/ui';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { brandColors, spacing, radii, typography, shadows } from '../theme';

type AdminTab = 'reviews' | 'verifications' | 'certifications';

interface Report {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  reporter: { id: string; full_name: string };
}

interface FlaggedReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  is_hidden: boolean;
  reviewer: { id: string; full_name: string; email: string };
  reviewee: { id: string; full_name: string; email: string };
  task: { id: string; title: string } | null;
  reports: Report[];
}

interface PendingVerification {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  verification_photo_url: string | null;
  verification_selfie_url: string | null;
  created_at: string;
}

interface PendingCertification {
  id: string;
  category: string;
  title: string;
  document_url: string;
  created_at: string;
  fixer: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

const CERT_CATEGORY_COLORS: Record<string, string> = {
  ELECTRICITY: '#D4A017',
  PLUMBING: '#0D7C6E',
};

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={14}
          color={brandColors.secondary}
        />
      ))}
    </View>
  );
}

export default function AdminScreen() {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('reviews');
  const [reviews, setReviews] = useState<FlaggedReview[]>([]);
  const [verifications, setVerifications] = useState<PendingVerification[]>([]);
  const [pendingCerts, setPendingCerts] = useState<PendingCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  const fetchFlagged = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/flagged-reviews');
      setReviews(res.data.reviews ?? []);
    } catch {
      const msg = t('admin.errors.loadFlagged');
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert(msg);
      } else {
        Alert.alert(t('common.error'), msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVerifications = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/pending-verifications');
      setVerifications(res.data.users ?? []);
    } catch {
      // silent
    }
  }, []);

  const fetchCertifications = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/pending-certifications');
      setPendingCerts(res.data.certifications ?? []);
    } catch {
      // silent
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchFlagged();
      void fetchVerifications();
      void fetchCertifications();
    }, [fetchFlagged, fetchVerifications, fetchCertifications]),
  );

  const confirmAction = (
    title: string,
    message: string,
    confirmLabel: string,
    destructive: boolean,
    onConfirm: () => void,
  ) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(`${title}\n\n${message}`)) onConfirm();
      return;
    }
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ]);
  };

  const handleHide = (reviewId: string, displayName: string) => {
    confirmAction(
      t('admin.confirm.hideReview.title', { name: displayName }),
      t('admin.confirm.hideReview.message'),
      t('admin.confirm.hideReview.confirmLabel'),
      true,
      async () => {
        try {
          await api.post(`/api/admin/reviews/${reviewId}/hide`);
          setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        } catch {
          const msg = t('admin.errors.hideReview');
          if (Platform.OS === 'web') {
            // eslint-disable-next-line no-alert
            window.alert(msg);
          } else {
            Alert.alert(t('common.error'), msg);
          }
        }
      },
    );
  };

  const handleDismiss = (reviewId: string, displayName: string) => {
    confirmAction(
      t('admin.confirm.dismissReports.title', { name: displayName }),
      t('admin.confirm.dismissReports.message'),
      t('admin.confirm.dismissReports.confirmLabel'),
      false,
      async () => {
        try {
          await api.post(`/api/admin/reviews/${reviewId}/dismiss`);
          setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        } catch {
          const msg = t('admin.errors.dismissReports');
          if (Platform.OS === 'web') {
            // eslint-disable-next-line no-alert
            window.alert(msg);
          } else {
            Alert.alert(t('common.error'), msg);
          }
        }
      },
    );
  };

  const handleVerify = (userId: string, action: 'approve' | 'reject', displayName: string) => {
    const isApprove = action === 'approve';
    const verifyKey = isApprove ? 'approveVerification' : 'rejectVerification';
    confirmAction(
      t(`admin.confirm.${verifyKey}.title`, { name: displayName }),
      t(`admin.confirm.${verifyKey}.message`),
      t(`admin.confirm.${verifyKey}.confirmLabel`),
      !isApprove,
      async () => {
        try {
          await api.post(`/api/admin/users/${userId}/verify`, { action });
          setVerifications((prev) => prev.filter((v) => v.id !== userId));
        } catch {
          const msg = t('admin.errors.verification', { action });
          if (Platform.OS === 'web') {
            // eslint-disable-next-line no-alert
            window.alert(msg);
          } else {
            Alert.alert(t('common.error'), msg);
          }
        }
      },
    );
  };

  const handleCertReview = (certId: string, action: 'approve' | 'reject', displayName: string) => {
    const isApprove = action === 'approve';
    const certKey = isApprove ? 'approveCertification' : 'rejectCertification';
    confirmAction(
      t(`admin.confirm.${certKey}.title`, { name: displayName }),
      t(`admin.confirm.${certKey}.message`),
      t(`admin.confirm.${certKey}.confirmLabel`),
      !isApprove,
      async () => {
        try {
          await api.post(`/api/admin/certifications/${certId}/review`, { action });
          setPendingCerts((prev) => prev.filter((c) => c.id !== certId));
        } catch {
          const msg = t('admin.errors.certification', { action });
          if (Platform.OS === 'web') {
            // eslint-disable-next-line no-alert
            window.alert(msg);
          } else {
            Alert.alert(t('common.error'), msg);
          }
        }
      },
    );
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) return <LoadingScreen label={t('admin.loading')} />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { direction: 'ltr' }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconShell}>
            <MaterialCommunityIcons name="shield-account" size={20} color={brandColors.secondary} />
          </View>
          <Text style={styles.headerTitle}>{t('admin.header.kicker')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Pressable
            onPress={() => void changeLanguage(language === 'en' ? 'he' : 'en')}
            style={styles.langBtn}
          >
            <MaterialCommunityIcons name="web" size={22} color={brandColors.secondary} />
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>{language === 'en' ? 'EN' : 'עב'}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => void handleLogout()} style={styles.logoutBtn}>
            <MaterialCommunityIcons name="logout" size={18} color={brandColors.danger} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.tabRow, { direction: 'ltr' }]}>
        <Pressable
          style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
          onPress={() => setActiveTab('reviews')}
        >
          <Text style={[typography.label, { color: activeTab === 'reviews' ? brandColors.primary : brandColors.textMuted }]}>
            {t('admin.tabs.reviews', { count: reviews.length })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'verifications' && styles.tabActive]}
          onPress={() => setActiveTab('verifications')}
        >
          <Text style={[typography.label, { color: activeTab === 'verifications' ? brandColors.primary : brandColors.textMuted }]}>
            {t('admin.tabs.verifications', { count: verifications.length })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'certifications' && styles.tabActive]}
          onPress={() => setActiveTab('certifications')}
        >
          <Text style={[typography.label, { color: activeTab === 'certifications' ? brandColors.primary : brandColors.textMuted }]}>
            {t('admin.tabs.certifications', { count: pendingCerts.length })}
          </Text>
        </Pressable>
      </View>

      {activeTab === 'certifications' ? (
        <FlatList
          data={pendingCerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const catColor = CERT_CATEGORY_COLORS[item.category] ?? brandColors.primary;
            return (
              <FCard style={{ ...styles.reviewCard, borderLeftColor: catColor }}>
                <View style={styles.reviewMeta}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>{item.fixer.full_name}</Text>
                    <Text style={[typography.caption, { color: brandColors.textMuted }]}>{item.fixer.email}</Text>
                  </View>
                  <View style={[styles.reasonBadge, { backgroundColor: catColor + '20' }]}>
                    <Text style={[typography.caption, { color: catColor, fontWeight: '700' }]}>
                      {t(`admin.categories.${item.category}`, { defaultValue: item.category })}
                    </Text>
                  </View>
                </View>

                {item.document_url && (
                  <Pressable onPress={() => setViewingPhotoUrl(item.document_url)} style={{ marginVertical: spacing.sm }}>
                    <Image source={{ uri: item.document_url }} style={{ width: '100%', height: 200, borderRadius: radii.md }} resizeMode="contain" />
                  </Pressable>
                )}

                <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                  {t('admin.certifications.submitted', { date: new Date(item.created_at).toLocaleDateString() })}
                </Text>

                <View style={styles.actions}>
                  <FButton
                    variant="outline"
                    size="sm"
                    icon="close-circle-outline"
                    onPress={() => handleCertReview(item.id, 'reject', item.fixer.full_name)}
                    style={{ flex: 1 }}
                  >
                    {t('admin.certifications.reject')}
                  </FButton>
                  <FButton
                    size="sm"
                    icon="check-circle-outline"
                    onPress={() => handleCertReview(item.id, 'approve', item.fixer.full_name)}
                    style={{ flex: 1 }}
                  >
                    {t('admin.certifications.approve')}
                  </FButton>
                </View>
              </FCard>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="certificate-outline"
              title={t('admin.empty.certificationsTitle')}
              message={t('admin.empty.certificationsMessage')}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      ) : activeTab === 'verifications' ? (
        <FlatList
          data={verifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <FCard style={{ ...styles.reviewCard, borderLeftColor: brandColors.primary }}>
              <View style={styles.reviewMeta}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>{item.full_name}</Text>
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>{item.email}</Text>
                </View>
                <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                  {t('admin.verifications.submitted', { date: new Date(item.created_at).toLocaleDateString() })}
                </Text>
              </View>
              {(item.verification_photo_url || item.verification_selfie_url) && (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm }}>
                  {item.verification_photo_url && (
                    <Pressable onPress={() => setViewingPhotoUrl(item.verification_photo_url)} style={{ flex: 1 }}>
                      <Image
                        source={{ uri: item.verification_photo_url }}
                        style={{ width: '100%', height: 160, borderRadius: radii.md }}
                        resizeMode="contain"
                      />
                      <Text style={[typography.caption, { color: brandColors.primary, textAlign: 'center', marginTop: spacing.xs }]}>
                        {t('admin.verifications.idPhoto')}
                      </Text>
                    </Pressable>
                  )}
                  {item.verification_selfie_url && (
                    <Pressable onPress={() => setViewingPhotoUrl(item.verification_selfie_url)} style={{ flex: 1 }}>
                      <Image
                        source={{ uri: item.verification_selfie_url }}
                        style={{ width: '100%', height: 160, borderRadius: radii.md }}
                        resizeMode="contain"
                      />
                      <Text style={[typography.caption, { color: brandColors.primary, textAlign: 'center', marginTop: spacing.xs }]}>
                        {t('admin.verifications.selfie')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
              <View style={styles.actions}>
                <FButton
                  variant="outline"
                  size="sm"
                  icon="close-circle-outline"
                  onPress={() => handleVerify(item.id, 'reject', item.full_name)}
                  style={{ flex: 1 }}
                >
                  {t('admin.verifications.reject')}
                </FButton>
                <FButton
                  size="sm"
                  icon="check-circle-outline"
                  onPress={() => handleVerify(item.id, 'approve', item.full_name)}
                  style={{ flex: 1 }}
                >
                  {t('admin.verifications.approve')}
                </FButton>
              </View>
            </FCard>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="shield-check-outline"
              title={t('admin.empty.verificationsTitle')}
              message={t('admin.empty.verificationsMessage')}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      ) : (
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <FCard style={styles.reviewCard}>
            <View style={styles.reviewMeta}>
              <View style={styles.metaBlock}>
                <Text style={[typography.caption, { color: brandColors.textMuted }]}>{t('admin.reviews.reviewer')}</Text>
                <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>
                  {item.reviewer.full_name}
                </Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={16} color={brandColors.textMuted} />
              <View style={styles.metaBlock}>
                <Text style={[typography.caption, { color: brandColors.textMuted }]}>{t('admin.reviews.reviewee')}</Text>
                <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>
                  {item.reviewee.full_name}
                </Text>
              </View>
            </View>

            {item.task && (
              <Text style={[typography.caption, { color: brandColors.textMuted, marginBottom: spacing.xs }]}>
                {t('admin.reviews.task', { title: item.task.title })}
              </Text>
            )}

            <StarRow rating={item.rating} />

            {item.comment && (
              <View style={styles.commentBox}>
                <Text style={[typography.body, { color: brandColors.textSecondary }]}>
                  &ldquo;{item.comment}&rdquo;
                </Text>
              </View>
            )}

            <View style={styles.reportsSection}>
              <Text style={[typography.bodyMedium, { color: brandColors.danger, marginBottom: spacing.xs }]}>
                {t('admin.reviews.reports', { count: item.reports.length })}
              </Text>
              {item.reports.map((report) => (
                <View key={report.id} style={{ marginBottom: spacing.xs }}>
                  <View style={styles.reportRow}>
                    <View style={[styles.reasonBadge, { backgroundColor: brandColors.dangerSoft }]}>
                      <Text style={[typography.caption, { color: brandColors.danger }]}>
                        {t(`admin.reasons.${report.reason}`, { defaultValue: report.reason })}
                      </Text>
                    </View>
                    <Text style={[typography.bodySm, { color: brandColors.textMuted, flex: 1 }]}>
                      {t('admin.reviews.by', { name: report.reporter.full_name })}
                    </Text>
                  </View>
                  {report.details ? (
                    <Text style={[typography.bodySm, { color: brandColors.textSecondary, marginLeft: spacing.sm, marginTop: 2 }]}>
                      &ldquo;{report.details}&rdquo;
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.actions}>
              <FButton
                variant="outline"
                size="sm"
                icon="eye-off-outline"
                onPress={() => handleHide(item.id, item.reviewer.full_name)}
                style={{ flex: 1 }}
              >
                {t('admin.reviews.hideReview')}
              </FButton>
              <FButton
                variant="secondary"
                size="sm"
                icon="check-circle-outline"
                onPress={() => handleDismiss(item.id, item.reviewer.full_name)}
                style={{ flex: 1 }}
              >
                {t('admin.reviews.dismiss')}
              </FButton>
            </View>
          </FCard>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="check-circle-outline"
            title={t('admin.empty.reviewsTitle')}
            message={t('admin.empty.reviewsMessage')}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
      )}

      {/* Full-screen photo viewer */}
      <Modal visible={!!viewingPhotoUrl} transparent animationType="fade" onRequestClose={() => setViewingPhotoUrl(null)}>
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalHeader}>
            <Pressable onPress={() => setViewingPhotoUrl(null)} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={28} color={brandColors.white} />
            </Pressable>
            <Pressable
              onPress={async () => {
                if (!viewingPhotoUrl) return;
                try {
                  const res = await api.get('/api/admin/download-photo', {
                    params: { url: viewingPhotoUrl },
                    responseType: 'blob',
                  });
                  const blobUrl = URL.createObjectURL(res.data as Blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = 'verification-photo.jpg';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                } catch {
                  Alert.alert(t('common.error'), t('admin.errors.downloadPhoto'));
                }
              }}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="download" size={28} color={brandColors.white} />
            </Pressable>
          </View>
          <Pressable style={styles.photoModalBody} onPress={() => setViewingPhotoUrl(null)}>
            {viewingPhotoUrl && (
              <Image
                source={{ uri: viewingPhotoUrl }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />
            )}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brandColors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.lg : spacing.huge,
    ...shadows.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIconShell: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(241,181,69,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241,181,69,0.22)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textOnDark,
  },
  langBtn: {
    position: 'relative' as const,
    padding: spacing.xs,
  },
  langBadge: {
    position: 'absolute' as const,
    bottom: 0,
    right: -2,
    backgroundColor: brandColors.primary,
    borderRadius: 6,
    paddingHorizontal: 3,
    minWidth: 16,
    alignItems: 'center' as const,
  },
  langBadgeText: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: brandColors.white,
    lineHeight: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: brandColors.dangerSoft,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: brandColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.outlineLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: brandColors.primary,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    borderLeftWidth: 3,
    borderLeftColor: brandColors.danger,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaBlock: {
    flex: 1,
  },
  commentBox: {
    backgroundColor: brandColors.surfaceAlt,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  reportsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: brandColors.outlineLight,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  reasonBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.lg : spacing.huge,
    paddingBottom: spacing.md,
  },
  photoModalBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: '90%',
    height: '80%',
  },
});
