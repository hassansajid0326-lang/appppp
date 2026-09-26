import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ExerciseItem, getExerciseVideoUrl } from '../lib/exerciseDatabase';
import { useAppTheme } from '../lib/theme';

interface ExerciseVisualCardProps {
  exercise: ExerciseItem;
  showFullDetails?: boolean;
}

function ExerciseVisualCardComponent({ exercise, showFullDetails = true }: ExerciseVisualCardProps) {
  const { colors, isDark } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'visual' | 'anatomy' | 'form' | 'breathing'>('visual');
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Muscle color mapping
  const getMuscleColors = (muscle: string) => {
    switch (muscle) {
      case 'chest':
        return { color: isDark ? '#c3f400' : '#65a30d', label: 'Pectoralis Major & Minor' };
      case 'back':
        return { color: '#38bdf8', label: 'Latissimus Dorsi & Rhomboids' };
      case 'shoulders':
        return { color: '#a855f7', label: 'Anterior, Lateral & Posterior Deltoids' };
      case 'biceps':
        return { color: '#ec4899', label: 'Biceps Brachii & Brachialis' };
      case 'triceps':
        return { color: '#f59e0b', label: 'Triceps Brachii (3 Heads)' };
      case 'forearms':
        return { color: '#10b981', label: 'Brachioradialis & Wrist Flexors' };
      case 'quads':
        return { color: isDark ? '#c3f400' : '#65a30d', label: 'Quadriceps Femoris (4 Heads)' };
      case 'hamstrings':
        return { color: '#ef4444', label: 'Biceps Femoris & Semitendinosus' };
      case 'glutes':
        return { color: '#f97316', label: 'Gluteus Maximus & Medius' };
      case 'calves':
        return { color: '#06b6d4', label: 'Gastrocnemius & Soleus' };
      case 'core':
        return { color: '#eab308', label: 'Rectus Abdominis & Obliques' };
      default:
        return { color: isDark ? '#c3f400' : '#65a30d', label: 'Full Body Kinetic Chain' };
    }
  };

  const muscleInfo = getMuscleColors(exercise.muscle_group);

  const handleOpenVideo = () => {
    const url = getExerciseVideoUrl(exercise);
    Linking.openURL(url).catch((err) => {
      console.warn('Could not open video URL:', err);
    });
  };

  const getDefaultIllustration = () => {
    if (exercise.image_url) return exercise.image_url;

    const baseMap: Record<string, string> = {
      'ch-01': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&auto=format&fit=crop&q=80',
      'bk-01': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
      'lg-01': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80',
      'sh-01': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80',
      'cal-03': 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&auto=format&fit=crop&q=80',
      'ht-07': 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=600&auto=format&fit=crop&q=80',
      'yg-01': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80',
      'cb-01': 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&auto=format&fit=crop&q=80',
    };

    if (baseMap[exercise.id]) return baseMap[exercise.id];

    switch (exercise.category) {
      case 'strength':
      case 'powerlifting':
      case 'olympic':
        return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80';
      case 'calisthenics':
        return 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&auto=format&fit=crop&q=80';
      case 'hiit':
      case 'functional':
        return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80';
      case 'yoga_mobility':
        return 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80';
      case 'combat':
        return 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&auto=format&fit=crop&q=80';
      default:
        return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80';
    }
  };

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Visual Navigation Tabs - Segmented Bar with No Overlap */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? '#051424' : '#f1f5f9', borderColor: colors.cardBorder }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn, 
            activeTab === 'visual' && [styles.tabBtnActive, { backgroundColor: isDark ? '#c3f400' : '#051424' }]
          ]}
          onPress={() => setActiveTab('visual')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="image-outline"
            size={12}
            color={activeTab === 'visual' ? (isDark ? '#051424' : '#ffffff') : colors.textMuted}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.tabText, 
              { color: colors.textMuted },
              activeTab === 'visual' && [styles.tabTextActive, { color: isDark ? '#051424' : '#ffffff' }]
            ]}
          >
            DEMO
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn, 
            activeTab === 'anatomy' && [styles.tabBtnActive, { backgroundColor: isDark ? '#c3f400' : '#051424' }]
          ]}
          onPress={() => setActiveTab('anatomy')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="human"
            size={13}
            color={activeTab === 'anatomy' ? (isDark ? '#051424' : '#ffffff') : colors.textMuted}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.tabText, 
              { color: colors.textMuted },
              activeTab === 'anatomy' && [styles.tabTextActive, { color: isDark ? '#051424' : '#ffffff' }]
            ]}
          >
            ANATOMY
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn, 
            activeTab === 'form' && [styles.tabBtnActive, { backgroundColor: isDark ? '#c3f400' : '#051424' }]
          ]}
          onPress={() => setActiveTab('form')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={12}
            color={activeTab === 'form' ? (isDark ? '#051424' : '#ffffff') : colors.textMuted}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.tabText, 
              { color: colors.textMuted },
              activeTab === 'form' && [styles.tabTextActive, { color: isDark ? '#051424' : '#ffffff' }]
            ]}
          >
            FORM
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn, 
            activeTab === 'breathing' && [styles.tabBtnActive, { backgroundColor: isDark ? '#c3f400' : '#051424' }]
          ]}
          onPress={() => setActiveTab('breathing')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="pulse-outline"
            size={12}
            color={activeTab === 'breathing' ? (isDark ? '#051424' : '#ffffff') : colors.textMuted}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.tabText, 
              { color: colors.textMuted },
              activeTab === 'breathing' && [styles.tabTextActive, { color: isDark ? '#051424' : '#ffffff' }]
            ]}
          >
            TEMPO
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Visual Demonstration Image */}
      {activeTab === 'visual' && (
        <View style={styles.visualFrame}>
          <Image
            source={{ uri: getDefaultIllustration() }}
            style={styles.exerciseImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />

          {imageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="small" color={isDark ? '#c3f400' : '#4d7c0f'} />
            </View>
          )}

          {/* Floating Tag Overlays */}
          <View style={styles.imageTopBadgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{exercise.category.toUpperCase()}</Text>
            </View>
            <View style={[styles.difficultyBadge, { borderColor: muscleInfo.color }]}>
              <Text style={[styles.difficultyBadgeText, { color: muscleInfo.color }]}>
                {exercise.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Image Bottom Bar with Gear & Direct YouTube Watch Button */}
          <View style={styles.imageBottomBar}>
            <View style={styles.gearWrap}>
              <Ionicons name="barbell-outline" size={13} color={isDark ? '#c3f400' : '#4d7c0f'} />
              <Text style={styles.equipmentLabel}>
                Gear: <Text style={{ color: '#ffffff', fontWeight: '700' }}>{exercise.equipment.toUpperCase()}</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.youtubeWatchBtn}
              activeOpacity={0.8}
              onPress={handleOpenVideo}
            >
              <Ionicons name="logo-youtube" size={13} color="#ffffff" />
              <Text style={styles.youtubeWatchBtnText}>YOUTUBE GUIDE</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tab 2: Anatomy & Muscle Activation Map */}
      {activeTab === 'anatomy' && (
        <View style={styles.anatomyContainer}>
          <View style={styles.anatomyHeaderRow}>
            <View style={[styles.anatomyIconWrap, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(195, 244, 0, 0.25)' }]}>
              <Ionicons name="body" size={20} color={isDark ? '#c3f400' : '#4d7c0f'} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.targetHeading, { color: colors.textMuted }]}>PRIMARY TARGET</Text>
              <Text style={[styles.targetMuscleName, { color: muscleInfo.color }]}>
                {exercise.muscle_group.toUpperCase()} — {muscleInfo.label}
              </Text>
            </View>
          </View>

          {/* Muscle Activation Bar Indicator */}
          <View style={[styles.activationBarContainer, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder }]}>
            <View style={styles.activationBarHeader}>
              <Text style={[styles.activationLabel, { color: colors.textSecondary }]}>Prime Mover Recruitment</Text>
              <Text style={[styles.activationPct, { color: colors.text }]}>85% - 95%</Text>
            </View>
            <View style={[styles.activationTrack, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <View style={[styles.activationFill, { width: '90%', backgroundColor: muscleInfo.color }]} />
            </View>
          </View>

          {/* Secondary Synergists */}
          {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
            <View style={styles.secondaryMusclesWrap}>
              <Text style={[styles.secondaryLabel, { color: colors.textMuted }]}>SECONDARY SYNERGISTS / STABILIZERS:</Text>
              <View style={styles.secondaryPillsRow}>
                {exercise.secondary_muscles.map((sm, idx) => (
                  <View key={idx} style={[styles.secondaryPill, { backgroundColor: isDark ? '#051424' : '#f1f5f9', borderColor: colors.cardBorder }]}>
                    <Ionicons name="link-outline" size={11} color="#38bdf8" />
                    <Text style={styles.secondaryPillText}>{sm.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.kineticChainTip, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.05)' : 'rgba(195, 244, 0, 0.12)', borderColor: isDark ? 'rgba(195, 244, 0, 0.2)' : 'rgba(195, 244, 0, 0.3)' }]}>
            <Ionicons name="flash-outline" size={14} color={isDark ? '#c3f400' : '#4d7c0f'} />
            <Text style={[styles.kineticTipText, { color: colors.textSecondary }]}>
              Engage your core to maintain a rigid kinetic chain and protect joints under load.
            </Text>
          </View>
        </View>
      )}

      {/* Tab 3: Form Checklist & Pitfalls */}
      {activeTab === 'form' && (
        <View style={styles.formCheckContainer}>
          <Text style={styles.formSectionTitle}>EXCELLENT FORM STANDARDS</Text>
          <View style={styles.formCheckItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={[styles.formCheckText, { color: colors.textSecondary }]}>
              Maintain full active range of motion without cutting the stretch short.
            </Text>
          </View>
          <View style={styles.formCheckItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={[styles.formCheckText, { color: colors.textSecondary }]}>
              Keep joint alignment stable throughout the concentric drive.
            </Text>
          </View>

          <Text style={[styles.formSectionTitle, { color: '#ef4444', marginTop: 14 }]}>
            COMMON PITFALLS TO AVOID
          </Text>
          <View style={styles.formCheckItem}>
            <Ionicons name="close-circle" size={16} color="#ef4444" />
            <Text style={[styles.formCheckText, { color: colors.textSecondary }]}>
              Avoid using uncontrolled momentum or swinging weights excessively.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.youtubeInlineCard, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder }]}
            onPress={handleOpenVideo}
          >
            <View style={styles.youtubeInlineIconWrap}>
              <Ionicons name="logo-youtube" size={16} color="#ffffff" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.youtubeInlineTitle, { color: colors.text }]}>Watch Form Masterclass</Text>
              <Text style={[styles.youtubeInlineSub, { color: colors.textMuted }]}>Visual breakdown of eccentric & concentric phases</Text>
            </View>
            <Ionicons name="open-outline" size={14} color={isDark ? '#c3f400' : '#4d7c0f'} />
          </TouchableOpacity>
        </View>
      )}

      {/* Tab 4: Tempo & Breathing Rhythm */}
      {activeTab === 'breathing' && (
        <View style={styles.breathingContainer}>
          <Text style={[styles.tempoHeading, { color: colors.textMuted }]}>BIOMECHANICAL TEMPO (ECCENTRIC : PAUSE : CONCENTRIC)</Text>
          <View style={[styles.tempoGrid, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder }]}>
            <View style={styles.tempoCol}>
              <Text style={[styles.tempoNum, { color: colors.text }]}>3s</Text>
              <Text style={[styles.tempoLabel, { color: colors.textMuted }]}>ECCENTRIC</Text>
              <Text style={[styles.tempoSub, { color: colors.textMuted }]}>Lower controlled</Text>
            </View>
            <View style={[styles.tempoDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.tempoCol}>
              <Text style={[styles.tempoNum, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>1s</Text>
              <Text style={[styles.tempoLabel, { color: colors.textMuted }]}>PAUSE</Text>
              <Text style={[styles.tempoSub, { color: colors.textMuted }]}>Peak stretch</Text>
            </View>
            <View style={[styles.tempoDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.tempoCol}>
              <Text style={[styles.tempoNum, { color: '#38bdf8' }]}>X</Text>
              <Text style={[styles.tempoLabel, { color: colors.textMuted }]}>CONCENTRIC</Text>
              <Text style={[styles.tempoSub, { color: colors.textMuted }]}>Explosive drive</Text>
            </View>
          </View>

          <View style={[styles.breathingCycleBox, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder }]}>
            <View style={styles.breathRow}>
              <View style={styles.breathIconIn}>
                <Ionicons name="arrow-down" size={12} color="#38bdf8" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.breathAction, { color: colors.text }]}>INHALE (Breathe In)</Text>
                <Text style={[styles.breathDesc, { color: colors.textMuted }]}>During eccentric phase (lowering load) to brace core intra-abdominal pressure.</Text>
              </View>
            </View>

            <View style={[styles.breathRow, { marginTop: 10 }]}>
              <View style={styles.breathIconOut}>
                <Ionicons name="arrow-up" size={12} color={isDark ? '#c3f400' : '#4d7c0f'} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.breathAction, { color: colors.text }]}>EXHALE (Breathe Out)</Text>
                <Text style={[styles.breathDesc, { color: colors.textMuted }]}>Past sticking point of concentric drive (pushing/pulling weight).</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default React.memo(ExerciseVisualCardComponent);

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  tabBtnActive: {},
  tabText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabTextActive: {},
  visualFrame: {
    height: 190,
    position: 'relative',
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 20, 36, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageTopBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(5, 20, 36, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  difficultyBadge: {
    backgroundColor: 'rgba(5, 20, 36, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  difficultyBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '700',
  },
  imageBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(5, 20, 36, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  gearWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  equipmentLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#94a3b8',
  },
  youtubeWatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  youtubeWatchBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  anatomyContainer: {
    padding: 14,
  },
  anatomyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  anatomyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetHeading: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  targetMuscleName: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  activationBarContainer: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  activationBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activationLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
  },
  activationPct: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    fontWeight: '700',
  },
  activationTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  activationFill: {
    height: '100%',
    borderRadius: 3,
  },
  secondaryMusclesWrap: {
    marginTop: 4,
    marginBottom: 10,
  },
  secondaryLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    marginBottom: 6,
  },
  secondaryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  secondaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  secondaryPillText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#38bdf8',
    fontWeight: '600',
  },
  kineticChainTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  kineticTipText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 10,
    lineHeight: 14,
  },
  formCheckContainer: {
    padding: 14,
  },
  formSectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 11,
    color: '#10b981',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formCheckItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  formCheckText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 16,
  },
  youtubeInlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  youtubeInlineIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeInlineTitle: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  youtubeInlineSub: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    marginTop: 1,
  },
  breathingContainer: {
    padding: 14,
  },
  tempoHeading: {
    fontFamily: 'Oswald',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tempoGrid: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  tempoCol: {
    flex: 1,
    alignItems: 'center',
  },
  tempoNum: {
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    fontWeight: '700',
  },
  tempoLabel: {
    fontFamily: 'Oswald',
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  tempoSub: {
    fontFamily: 'Inter',
    fontSize: 8,
  },
  tempoDivider: {
    width: 1,
    height: 24,
  },
  breathingCycleBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  breathRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  breathIconIn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginTop: 1,
  },
  breathIconOut: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 1,
  },
  breathAction: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: '700',
  },
  breathDesc: {
    fontFamily: 'Inter',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
  },
});
