import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../lib/store';
import { useOfflineStore } from '../../lib/offlineStore';
import { useAppTheme } from '../../lib/theme';
import {
  askAICoach,
  compileCoachContext,
  generateProgressAssessment,
  checkModelExists,
  getModelDownloadStatus,
  startOrResumeDownload,
  pauseModelDownload,
  deleteLocalModel,
  MODEL_DISPLAY_INFO,
  AICoachRole,
  AIConnectionMode,
  AIModelPref,
  ChatMessage,
  ChatSession,
  RoutineAction,
  loadAllChatSessions,
  saveChatSessions,
  getActiveSessionId,
  setActiveSessionId,
} from '../../lib/AICoachService';

export default function AICoachScreen() {
  const { session } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const userId = session?.user?.id || 'guest';

  // Navigation / Settings state
  const [role, setRole] = useState<AICoachRole>('trainer');
  const [connectionMode, setConnectionMode] = useState<AIConnectionMode>('hybrid');
  const [modelPref, setModelPref] = useState<AIModelPref>('0.5b');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);

  // Model Download logic states
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'paused' | 'completed' | 'error'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadProgressText, setDownloadProgressText] = useState('');

  // Active Chat and Sessions state
  const [currentSessionId, setCurrentSessionId] = useState<string>('default_session');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Keyboard offset for Android bottom tabs
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Daily clinical report
  const [assessment, setAssessment] = useState<{ strengths: string; opportunities: string; tip: string } | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [assessmentCollapsed, setAssessmentCollapsed] = useState(true);

  // Abort controller ref for generation cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // 1. Setup Keyboard listeners for Android input visibility
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 2. Load preferences, sessions and model status on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('fitpulse_ai_coach_role');
        if (storedRole) setRole(storedRole as AICoachRole);
        
        const storedMode = await AsyncStorage.getItem('fitpulse_ai_connection_pref');
        if (storedMode) setConnectionMode(storedMode as AIConnectionMode);

        const storedModel = await AsyncStorage.getItem('fitpulse_ai_model_pref');
        if (storedModel && (storedModel === '0.5b' || storedModel === 'gemma-3-1b')) {
          setModelPref(storedModel as AIModelPref);
        }

        // Check if first-time user
        const tutorialSeen = await AsyncStorage.getItem('fitpulse_ai_tutorial_seen');
        if (!tutorialSeen) {
          setTutorialVisible(true);
        }

        // Load all saved chat sessions
        const savedSessions = await loadAllChatSessions();
        setSessions(savedSessions);

        const activeId = await getActiveSessionId();
        let targetSession: ChatSession | undefined;

        if (activeId && savedSessions.length > 0) {
          targetSession = savedSessions.find(s => s.id === activeId);
        }

        if (!targetSession && savedSessions.length > 0) {
          targetSession = savedSessions[0];
        }

        if (targetSession) {
          setCurrentSessionId(targetSession.id);
          setRole(targetSession.role || 'trainer');
          setMessages(targetSession.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
        } else {
          // Create initial default session
          const newId = `session_${Date.now()}`;
          const initialMessages: ChatMessage[] = [
            {
              id: 'welcome',
              role: 'assistant',
              content: `Salam! Main aapka personal FitPulse AI Coach hoon. Aap mujhse workouts, diet plans, calories, ya health recovery ke baray me kuch bhi pooch sakte hain.`,
              timestamp: new Date()
            }
          ];
          const initialSession: ChatSession = {
            id: newId,
            title: 'New Coaching Session',
            role: 'trainer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: initialMessages
          };
          setCurrentSessionId(newId);
          setMessages(initialMessages);
          setSessions([initialSession]);
          await saveChatSessions([initialSession]);
          await setActiveSessionId(newId);
        }
      } catch (e) {
        console.log('Initialization failed:', e);
      }
    };
    initialize();
  }, []);

  // 3. Check model existence and partial download status whenever modelPref changes
  useEffect(() => {
    const checkModel = async () => {
      const status = await getModelDownloadStatus(modelPref);
      setIsDownloaded(status.isDownloaded);
      if (status.isDownloaded) {
        setDownloadStatus('completed');
        setDownloadProgress(100);
        setDownloadProgressText(status.formattedText);
      } else if (status.isPaused) {
        setDownloadStatus('paused');
        setDownloadProgress(status.percent);
        setDownloadProgressText(status.formattedText);
      } else {
        setDownloadStatus('idle');
        setDownloadProgress(0);
        setDownloadProgressText('');
      }
    };
    checkModel();
  }, [modelPref]);

  // 4. Save active messages into the current session and storage
  const syncMessagesToSession = async (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        // Compute title from first user query if default
        let title = s.title;
        if (title === 'New Coaching Session' || title === 'Chat Session') {
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.content.slice(0, 32) + (firstUserMsg.content.length > 32 ? '...' : '');
          }
        }
        return {
          ...s,
          title,
          role,
          updatedAt: new Date().toISOString(),
          messages: newMessages
        };
      }
      return s;
    });
    setSessions(updatedSessions);
    await saveChatSessions(updatedSessions);
  };

  // Trigger loading assessment summary
  const handleLoadAssessment = async () => {
    setLoadingAssessment(true);
    try {
      const context = await compileCoachContext(userId);
      const res = await generateProgressAssessment(context, role, connectionMode, modelPref);
      setAssessment(res);
      setAssessmentCollapsed(false);
    } catch (err) {
      console.log('Failed to generate daily assessment:', err);
      Alert.alert('Assessment', 'Could not load today\'s assessment. Please check your connection or model settings.');
    } finally {
      setLoadingAssessment(false);
    }
  };

  // Start / Resume Model download
  const handleStartOrResumeDownload = async () => {
    setDownloadStatus('downloading');
    try {
      const targetPath = await startOrResumeDownload(modelPref, (info) => {
        setDownloadProgress(info.percent);
        setDownloadProgressText(info.formattedText);
      });

      if (!targetPath) {
        // Paused or interrupted in JS
        const status = await getModelDownloadStatus(modelPref);
        if (status.isPaused) {
          setDownloadStatus('paused');
          setDownloadProgress(status.percent);
          setDownloadProgressText(status.formattedText);
        } else {
          setDownloadStatus('idle');
        }
        return;
      }

      setIsDownloaded(true);
      setDownloadStatus('completed');
      setDownloadProgress(100);
      Alert.alert('Ready for Offline Use ✅', `${MODEL_DISPLAY_INFO[modelPref].name} successfully downloaded on your phone!`);
    } catch (err: any) {
      console.log('Download model failed:', err);
      const status = await getModelDownloadStatus(modelPref);
      if (status.isPaused) {
        setDownloadStatus('paused');
        setDownloadProgress(status.percent);
        setDownloadProgressText(status.formattedText);
        return;
      }

      setDownloadStatus('error');
      if (err.message === 'NO_INTERNET') {
        Alert.alert('Internet Required 📶', 'Please connect to Wi-Fi or Mobile Data to download the model.');
      } else if (err.message === 'INSUFFICIENT_STORAGE') {
        Alert.alert('Storage Full 💾', 'Not enough free storage space to download this offline model.');
      } else {
        Alert.alert('Download Interrupted', 'Download was interrupted. You can tap Resume anytime.');
      }
    }
  };

  // Pause Model download
  const handlePauseDownload = () => {
    pauseModelDownload();
    setDownloadStatus('paused');
  };

  // Cancel / Delete Model
  const handleDeleteOrCancelModel = async () => {
    Alert.alert(
      'Remove Offline Model 🗑️',
      'Are you sure you want to remove this offline model and free phone storage?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLocalModel(modelPref);
            setIsDownloaded(false);
            setDownloadStatus('idle');
            setDownloadProgress(0);
            setDownloadProgressText('');
          }
        }
      ]
    );
  };

  // Switch Role
  const handleRoleChange = async (newRole: AICoachRole) => {
    setRole(newRole);
    try {
      await AsyncStorage.setItem('fitpulse_ai_coach_role', newRole);
    } catch (e) {
      console.log(e);
    }
  };

  // Complete First-Time Tutorial
  const handleFinishTutorial = async (chosenMode: AIConnectionMode, chosenModel?: AIModelPref) => {
    setConnectionMode(chosenMode);
    await AsyncStorage.setItem('fitpulse_ai_connection_pref', chosenMode);
    if (chosenModel) {
      setModelPref(chosenModel);
      await AsyncStorage.setItem('fitpulse_ai_model_pref', chosenModel);
    }
    await AsyncStorage.setItem('fitpulse_ai_tutorial_seen', 'true');
    setTutorialVisible(false);

    if (chosenMode === 'offline_only') {
      setTimeout(() => handleStartOrResumeDownload(), 400);
    }
  };

  // Stop / Cancel active generation
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (connectionMode === 'offline_only' && !isDownloaded) {
      Alert.alert(
        'Offline Model Required 🔒',
        'Offline AI needs a one-time model download (~644 MB) to chat without internet. Open Settings ⚙️ to download.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Download Now', onPress: () => setSettingsVisible(true) }
        ]
      );
      return;
    }

    setInputText('');
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    const newMsgList = [...messages, userMsg];
    await syncMessagesToSession(newMsgList);
    setIsGenerating(true);

    const assistantMsgId = `ai_${Date.now()}`;
    const placeholderMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    const updatedWithPlaceholder = [...newMsgList, placeholderMsg];
    setMessages(updatedWithPlaceholder);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const context = await compileCoachContext(userId);
      const history = newMsgList
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      let responseText = '';
      
      const rawText = await askAICoach(
        text,
        context,
        history,
        role,
        connectionMode,
        modelPref,
        (token) => {
          if (abortController.signal.aborted) return;
          responseText += token;
          setMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? { ...m, content: responseText } : m))
          );
        },
        abortController.signal
      );

      if (abortController.signal.aborted) {
        setIsGenerating(false);
        return;
      }

      // Parse interactive schedule actions
      let cleanedText = rawText;
      let parsedActions: RoutineAction[] = [];
      try {
        const match = rawText.match(/<routine_actions>([\s\S]*?)<\/routine_actions>/i);
        if (match && match[1]) {
          const jsonActions = JSON.parse(match[1].trim());
          if (Array.isArray(jsonActions) && jsonActions.length > 0) {
            parsedActions = jsonActions.filter(item => item && item.title);
          }
          cleanedText = rawText.replace(/<routine_actions>([\s\S]*?)<\/routine_actions>/i, '').trim();
        }
      } catch (parseErr) {
        console.log('Action parse error:', parseErr);
      }

      const finalMessages = updatedWithPlaceholder.map(m =>
        m.id === assistantMsgId
          ? {
              ...m,
              content: cleanedText || responseText,
              actions: parsedActions.length > 0 ? parsedActions : undefined,
              actionAdded: parsedActions.length > 0 ? new Array(parsedActions.length).fill(false) : undefined
            }
          : m
      );

      await syncMessagesToSession(finalMessages);

    } catch (err: any) {
      if (abortController.signal.aborted) {
        setIsGenerating(false);
        return;
      }
      console.log('Failed to fetch AI reply:', err);
      let errorNotice = 'Maaf kijiye, response load nahi ho saka. Internet connection check karein.';
      if (err.message === 'MODEL_NOT_DOWNLOADED') {
        errorNotice = 'Offline model abhi download nahi hai. Please Settings ⚙️ se model download karein.';
      } else if (err.message?.includes('MODEL_INIT_FAILED')) {
        errorNotice = 'Offline engine load karne me issue aya. Phone restart karein ya online mode switch karein.';
      }

      const fallbackMessages = updatedWithPlaceholder.map(m =>
        m.id === assistantMsgId ? { ...m, content: errorNotice } : m
      );
      await syncMessagesToSession(fallbackMessages);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // Start New Chat Session
  const handleStartNewChat = async () => {
    const newId = `session_${Date.now()}`;
    const initialMessages: ChatMessage[] = [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Naya session shuru ho gaya! Aaj aap ${role === 'trainer' ? 'Gym Workout' : role === 'nutritionist' ? 'Diet & Nutrition' : 'Health Recovery'} ke hawale se kya poochna chahte hain?`,
        timestamp: new Date()
      }
    ];

    const newSession: ChatSession = {
      id: newId,
      title: 'New Coaching Session',
      role: role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: initialMessages
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSessionId(newId);
    setMessages(initialMessages);
    await saveChatSessions(updatedSessions);
    await setActiveSessionId(newId);
    setHistoryVisible(false);
  };

  // Select / Load a Chat Session
  const handleSelectSession = async (sessionItem: ChatSession) => {
    setCurrentSessionId(sessionItem.id);
    setRole(sessionItem.role || 'trainer');
    setMessages(sessionItem.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    await setActiveSessionId(sessionItem.id);
    setHistoryVisible(false);
  };

  // Delete an individual Session
  const handleDeleteSession = async (sessionId: string) => {
    const remaining = sessions.filter(s => s.id !== sessionId);
    setSessions(remaining);
    await saveChatSessions(remaining);

    if (sessionId === currentSessionId) {
      if (remaining.length > 0) {
        handleSelectSession(remaining[0]);
      } else {
        handleStartNewChat();
      }
    }
  };

  // Clear all Chat History
  const handleClearAllHistory = () => {
    Alert.alert(
      'Clear All Chat History 🗑️',
      'Kya aap apni saari chat sessions delete karna chahte hain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            const newId = `session_${Date.now()}`;
            const initialMessages: ChatMessage[] = [
              {
                id: 'welcome',
                role: 'assistant',
                content: `Chat history reset ho gayi hai. Aaj aap kya plan karna chahte hain?`,
                timestamp: new Date()
              }
            ];
            const freshSession: ChatSession = {
              id: newId,
              title: 'New Coaching Session',
              role: 'trainer',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: initialMessages
            };
            setSessions([freshSession]);
            setCurrentSessionId(newId);
            setMessages(initialMessages);
            await saveChatSessions([freshSession]);
            await setActiveSessionId(newId);
            setHistoryVisible(false);
          }
        }
      ]
    );
  };

  // Dynamic quick prompts for each role
  const getRolePrompts = () => {
    switch (role) {
      case 'trainer':
        return [
          'Suggest a 3-day workout split',
          'Best home workout with bodyweight',
          'Warmup and stretching routine',
          'How many sets & reps for muscle growth?'
        ];
      case 'nutritionist':
        return [
          'Calculate my calorie & protein targets',
          'Suggest high-protein healthy snacks',
          'Daily hydration & water schedule',
          'Healthy dinner options for weight loss'
        ];
      case 'doctor':
        return [
          'Review today’s heart rate & recovery',
          'Signs of overtraining or physical strain',
          'How to improve deep sleep score?',
          'Is my resting heart rate healthy?'
        ];
      case 'wellness':
      default:
        return [
          '5-minute breathing exercise for stress',
          'Tips for deeper, relaxing sleep',
          'How to build consistent daily habits',
          'Post-workout recovery mindfulness'
        ];
    }
  };

  return (
    <LinearGradient colors={colors.backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="sparkles" size={18} color={isDark ? "#c3f400" : "#65a30d"} style={{ marginRight: 6 }} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI COACH COCKPIT</Text>
            {connectionMode === 'hybrid' ? (
              <View style={[styles.onlineBadge, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(101, 163, 13, 0.15)' }]}>
                <Text style={[styles.onlineBadgeText, { color: isDark ? '#c3f400' : '#65a30d' }]}>CLOUD ⚡</Text>
              </View>
            ) : (
              <View style={[styles.onlineBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Text style={[styles.onlineBadgeText, { color: '#38bdf8' }]}>
                  {isDownloaded ? 'OFFLINE 🔒' : 'DOWNLOAD REQ ⚠️'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Chat History Icon */}
            <TouchableOpacity
              onPress={() => setHistoryVisible(true)}
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Settings Icon */}
            <TouchableOpacity
              onPress={() => setSettingsVisible(true)}
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Roles Filter Selector */}
        <View style={styles.rolesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rolesScroll}>
            {(['trainer', 'nutritionist', 'doctor', 'wellness'] as const).map((r) => {
              const active = role === r;
              let label = 'Gym Trainer';
              let icon = 'barbell-outline';
              
              if (r === 'trainer') { label = 'Gym Trainer 🏋️'; icon = 'barbell-outline'; }
              else if (r === 'nutritionist') { label = 'Dietitian 🥗'; icon = 'restaurant-outline'; }
              else if (r === 'doctor') { label = 'Doctor 🩺'; icon = 'medical-outline'; }
              else if (r === 'wellness') { label = 'Wellness 🌿'; icon = 'leaf-outline'; }
              
              return (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleChip, 
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    active && styles.roleChipActive
                  ]}
                  onPress={() => handleRoleChange(r)}
                >
                  <Ionicons name={icon as any} size={14} color={active ? '#051424' : colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.roleLabel, { color: colors.textSecondary }, active && styles.roleLabelActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          
          {/* Main Content Scroll */}
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[styles.chatScroll, keyboardVisible && { paddingBottom: 10 }]}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            
            {/* Offline Model Not Downloaded Banner */}
            {connectionMode === 'offline_only' && !isDownloaded && (
              <View style={[styles.offlineAlertBanner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="cloud-download-outline" size={20} color="#38bdf8" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offlineAlertTitle}>Offline Model Download Required</Text>
                    <Text style={[styles.offlineAlertDesc, { color: colors.textSecondary }]}>
                      Download the on-device AI ({MODEL_DISPLAY_INFO[modelPref].size}) to chat without internet.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.btnBannerDownload}
                  onPress={() => setSettingsVisible(true)}
                >
                  <Text style={styles.btnBannerDownloadText}>Download ⬇️</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Daily Clinical Assessment Area */}
            <View style={[styles.assessmentSection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={styles.assessmentToggle}
                onPress={() => {
                  if (!assessment) {
                    handleLoadAssessment();
                  } else {
                    setAssessmentCollapsed(!assessmentCollapsed);
                  }
                }}
              >
                <View style={styles.assessmentHeaderLeft}>
                  <Ionicons name="pulse" size={16} color={isDark ? "#c3f400" : "#65a30d"} style={{ marginRight: 6 }} />
                  <Text style={[styles.assessmentToggleTitle, { color: colors.text }]}>Today's Clinical Assessment</Text>
                </View>
                {loadingAssessment ? (
                  <ActivityIndicator size="small" color={isDark ? "#c3f400" : "#65a30d"} />
                ) : (
                  <Ionicons
                    name={assessmentCollapsed ? "chevron-down" : "chevron-up"}
                    size={16}
                    color={colors.textMuted}
                  />
                )}
              </TouchableOpacity>

              {assessment && !assessmentCollapsed && (
                <View style={styles.assessmentCards}>
                  <View style={[styles.assessCard, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                    <View style={styles.assessCardHeader}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={isDark ? "#c3f400" : "#65a30d"} />
                      <Text style={[styles.assessCardTitle, { color: isDark ? '#c3f400' : '#65a30d' }]}>STRENGTHS</Text>
                    </View>
                    <Text style={[styles.assessCardBody, { color: colors.text }]}>{assessment.strengths}</Text>
                  </View>

                  <View style={[styles.assessCard, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                    <View style={styles.assessCardHeader}>
                      <Ionicons name="trending-up-outline" size={14} color="#ff4a4a" />
                      <Text style={[styles.assessCardTitle, { color: '#ff4a4a' }]}>OPPORTUNITIES</Text>
                    </View>
                    <Text style={[styles.assessCardBody, { color: colors.text }]}>{assessment.opportunities}</Text>
                  </View>

                  <View style={[styles.assessCard, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                    <View style={styles.assessCardHeader}>
                      <Ionicons name="bulb-outline" size={14} color="#38bdf8" />
                      <Text style={[styles.assessCardTitle, { color: '#38bdf8' }]}>COACH TIP</Text>
                    </View>
                    <Text style={[styles.assessCardBody, { color: colors.text }]}>{assessment.tip}</Text>
                  </View>

                  <TouchableOpacity style={[styles.btnReassess, { backgroundColor: colors.cardSubtle }]} onPress={handleLoadAssessment}>
                    <Text style={[styles.btnReassessText, { color: isDark ? '#c3f400' : '#65a30d' }]}>REFRESH METRICS ASSESSMENT</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Chat Messages */}
            {messages.map((m) => {
              const isAI = m.role === 'assistant';
              const formattedTime = m.timestamp instanceof Date
                ? m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <View
                  key={m.id}
                  style={[
                    styles.messageRow,
                    isAI ? styles.messageLeft : styles.messageRight
                  ]}
                >
                  {isAI && (
                    <View style={styles.aiAvatar}>
                      <Ionicons
                        name={
                          role === 'trainer' ? 'barbell' :
                          role === 'nutritionist' ? 'restaurant' :
                          role === 'wellness' ? 'leaf' : 'medical'
                        }
                        size={12}
                        color="#051424"
                      />
                    </View>
                  )}
                  <View style={{ flex: 1, maxWidth: '85%' }}>
                    <View style={[
                      styles.bubble, 
                      isAI 
                        ? [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder }] 
                        : styles.userBubble
                    ]}>
                      <Text style={[styles.bubbleText, { color: isAI ? colors.text : '#051424' }]}>{m.content}</Text>
                      <Text style={[styles.bubbleTime, { color: isAI ? colors.textMuted : 'rgba(5, 20, 36, 0.6)' }]}>{formattedTime}</Text>
                    </View>

                    {/* Interactive Action Cards */}
                    {m.actions && m.actions.length > 0 && (
                      <View style={[styles.actionsBox, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                        <Text style={[styles.actionsHeader, { color: colors.textMuted }]}>📌 SUGGESTED SCHEDULE ACTIONS:</Text>
                        {m.actions.map((act, actIdx) => {
                          const isAdded = m.actionAdded?.[actIdx];
                          return (
                            <View key={actIdx} style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={[styles.actionCardTitle, { color: colors.text }]}>{act.title}</Text>
                                <Text style={[styles.actionCardTime, { color: colors.textSecondary }]}>
                                  ⏰ {act.reminder_time || '08:00'} • {act.repeat_rule || 'Daily'}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.actionCardBtn, isAdded && styles.actionCardBtnAdded]}
                                disabled={isAdded}
                                onPress={async () => {
                                  await useOfflineStore.getState().addRoutineItem(
                                    userId,
                                    act.title,
                                    act.repeat_rule || 'daily',
                                    act.repeat_days || [],
                                    act.reminder_time || '08:00'
                                  );
                                  setMessages(prev =>
                                    prev.map(item => {
                                      if (item.id === m.id) {
                                        const newAdded = [...(item.actionAdded || [])];
                                        newAdded[actIdx] = true;
                                        return { ...item, actionAdded: newAdded };
                                      }
                                      return item;
                                    })
                                  );
                                  Alert.alert('Added to Schedule ✅', `"${act.title}" aapke routine checklist mein add ho gaya hai!`);
                                }}
                              >
                                <Ionicons
                                  name={isAdded ? "checkmark-circle" : "add-circle"}
                                  size={14}
                                  color={isAdded ? (isDark ? "#c3f400" : "#65a30d") : "#051424"}
                                  style={{ marginRight: 4 }}
                                />
                                <Text style={[styles.actionCardBtnText, isAdded && styles.actionCardBtnTextAdded]}>
                                  {isAdded ? 'Added ✅' : '+ Add to Schedule'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {isGenerating && messages[messages.length - 1]?.content === '' && (
              <View style={styles.loaderRow}>
                <ActivityIndicator size="small" color={isDark ? "#c3f400" : "#65a30d"} />
                <Text style={[styles.loaderText, { color: colors.textMuted }]}>Coach is preparing your response...</Text>
              </View>
            )}

          </ScrollView>

          {/* Stop Generating Floating Action Bar */}
          {isGenerating && (
            <View style={styles.stopGeneratingBar}>
              <TouchableOpacity style={styles.btnStopGenerating} onPress={handleStopGenerating}>
                <Ionicons name="stop-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.btnStopGeneratingText}>STOP GENERATING</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Prompt Presets row */}
          {!isGenerating && (
            <View style={[styles.presetsWrapper, { backgroundColor: colors.cardSubtle, borderTopColor: colors.borderSubtle }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                {getRolePrompts().map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetPrompt, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => handleSendMessage(preset)}
                  >
                    <Text style={[styles.presetPromptText, { color: colors.textSecondary }]}>{preset}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Chat Input panel */}
          <View style={[styles.inputPanel, { backgroundColor: colors.card, borderTopColor: colors.borderSubtle }]}>
            <View style={[styles.inputTextRow, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
              <TextInput
                style={[styles.textInput, { marginLeft: 12, color: colors.text }]}
                placeholder={`Ask your ${role === 'trainer' ? 'Gym Trainer' : role === 'nutritionist' ? 'Dietitian' : 'Doctor'}...`}
                placeholderTextColor={colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
                editable={!isGenerating}
              />
              {isGenerating ? (
                <TouchableOpacity onPress={handleStopGenerating} style={[styles.sendBtn, { backgroundColor: '#ef4444' }]}>
                  <Ionicons name="square" size={14} color="#ffffff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleSendMessage()}
                  style={styles.sendBtn}
                  disabled={!inputText.trim()}
                >
                  <Ionicons name="paper-plane" size={18} color={inputText.trim() ? '#051424' : colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

        </KeyboardAvoidingView>

        {/* 1. Chat History Drawer / Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={historyVisible}
          onRequestClose={() => setHistoryVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.cardBorder, maxHeight: '85%' }]}>
              
              <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time" size={18} color={isDark ? "#c3f400" : "#65a30d"} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Chat History</Text>
                  <Text style={styles.historyBadge}>{sessions.length} Chats</Text>
                </View>
                <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Start New Chat Button */}
              <TouchableOpacity style={styles.btnNewChat} onPress={handleStartNewChat}>
                <Ionicons name="add-circle" size={18} color="#051424" style={{ marginRight: 6 }} />
                <Text style={styles.btnNewChatText}>+ START NEW CHAT</Text>
              </TouchableOpacity>

              {/* Chat Sessions List */}
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {sessions.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontFamily: 'Inter', fontSize: 12 }}>No saved chats yet.</Text>
                  </View>
                ) : (
                  sessions.map((s) => {
                    const isCurrent = s.id === currentSessionId;
                    const dateStr = new Date(s.updatedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const lastMsg = s.messages[s.messages.length - 1]?.content || 'Empty conversation';

                    return (
                      <View key={s.id} style={[
                        styles.historyCard, 
                        { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle },
                        isCurrent && styles.historyCardActive
                      ]}>
                        <TouchableOpacity
                          style={{ flex: 1, paddingRight: 8 }}
                          onPress={() => handleSelectSession(s)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={[styles.historyTitle, { color: colors.text }, isCurrent && { color: isDark ? '#c3f400' : '#65a30d' }]} numberOfLines={1}>
                              {s.title}
                            </Text>
                            <Text style={[styles.historyTime, { color: colors.textMuted }]}>{dateStr}</Text>
                          </View>
                          <Text style={[styles.historySnippet, { color: colors.textSecondary }]} numberOfLines={1}>
                            {lastMsg}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteSession(s.id)}
                          style={styles.historyDeleteBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Clear All Chats */}
              {sessions.length > 0 && (
                <TouchableOpacity style={styles.btnClearHistory} onPress={handleClearAllHistory}>
                  <Ionicons name="trash-bin-outline" size={14} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.btnClearHistoryText}>Clear All History</Text>
                </TouchableOpacity>
              )}

            </View>
          </View>
        </Modal>

        {/* 2. First-Time Friendly Onboarding Tutorial Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={tutorialVisible}
          onRequestClose={() => setTutorialVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={[styles.tutorialContent, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <View style={[styles.welcomeIconCircle, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.12)' : 'rgba(101, 163, 13, 0.15)', borderColor: isDark ? '#c3f400' : '#65a30d' }]}>
                  <Ionicons name="sparkles" size={28} color={isDark ? "#c3f400" : "#65a30d"} />
                </View>
                <Text style={[styles.tutorialTitle, { color: colors.text }]}>WELCOME TO AI COACH</Text>
                <Text style={[styles.tutorialSubtitle, { color: colors.textSecondary }]}>
                  Your 24/7 personal Gym Trainer, Dietitian, and Doctor assistant in one app.
                </Text>
              </View>

              <View style={{ gap: 12, marginVertical: 10 }}>
                {/* Option 1: Cloud AI */}
                <TouchableOpacity
                  style={[styles.tutorialOptionCard, { backgroundColor: colors.cardSubtle, borderColor: isDark ? '#c3f400' : '#65a30d' }]}
                  onPress={() => handleFinishTutorial('hybrid')}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.tutorialOptionTitle, { color: isDark ? '#c3f400' : '#65a30d' }]}>⚡ Instant Cloud AI (Recommended)</Text>
                    <Text style={[styles.tutorialBadgeGreen, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(101, 163, 13, 0.15)', color: isDark ? '#c3f400' : '#65a30d' }]}>Fastest</Text>
                  </View>
                  <Text style={[styles.tutorialOptionDesc, { color: colors.textSecondary }]}>
                    • 0 MB phone storage used{'\n'}
                    • Instant expert coaching & smart diet plans{'\n'}
                    • Works seamlessly with active internet
                  </Text>
                  <View style={[styles.btnStartNow, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]}>
                    <Text style={[styles.btnStartNowText, { color: isDark ? '#051424' : '#ffffff' }]}>Start with Instant Cloud AI 🚀</Text>
                  </View>
                </TouchableOpacity>

                {/* Option 2: Offline Phone AI */}
                <TouchableOpacity
                  style={[styles.tutorialOptionCard, { backgroundColor: colors.cardSubtle, borderColor: '#38bdf8' }]}
                  onPress={() => handleFinishTutorial('offline_only', '0.5b')}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.tutorialOptionTitle, { color: '#38bdf8' }]}>🔒 Offline Phone AI</Text>
                    <Text style={[styles.tutorialBadgeGreen, { backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }]}>Private</Text>
                  </View>
                  <Text style={[styles.tutorialOptionDesc, { color: colors.textSecondary }]}>
                    • Runs 100% on your phone without internet{'\n'}
                    • Perfect for basement gyms or traveling{'\n'}
                    • One-time download (~644 MB)
                  </Text>
                  <View style={[styles.btnStartNow, { backgroundColor: '#38bdf8' }]}>
                    <Text style={[styles.btnStartNowText, { color: '#051424' }]}>Download for Offline Use ⬇️</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={[styles.tutorialFooterText, { color: colors.textMuted }]}>
                You can switch modes anytime from the top-right Settings ⚙️ icon.
              </Text>
            </View>
          </View>
        </Modal>

        {/* 3. AI Settings Modal (Conditional GGUF visibility & Pause/Resume manager) */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={settingsVisible}
          onRequestClose={() => setSettingsVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>AI Coach Settings</Text>
                <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Connection Mode Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>HOW DO YOU WANT AI TO RUN?</Text>
              <View style={[styles.toggleRow, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn, 
                    connectionMode === 'hybrid' && [styles.toggleBtnActive, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]
                  ]}
                  onPress={async () => {
                    setConnectionMode('hybrid');
                    await AsyncStorage.setItem('fitpulse_ai_connection_pref', 'hybrid');
                  }}
                >
                  <Text style={[
                    styles.toggleBtnText, 
                    { color: colors.textMuted },
                    connectionMode === 'hybrid' && { color: isDark ? '#c3f400' : '#65a30d' }
                  ]}>
                    CLOUD AI (ONLINE) ⚡
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn, 
                    connectionMode === 'offline_only' && [styles.toggleBtnActive, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]
                  ]}
                  onPress={async () => {
                    setConnectionMode('offline_only');
                    await AsyncStorage.setItem('fitpulse_ai_connection_pref', 'offline_only');
                  }}
                >
                  <Text style={[
                    styles.toggleBtnText, 
                    { color: colors.textMuted },
                    connectionMode === 'offline_only' && { color: isDark ? '#c3f400' : '#65a30d' }
                  ]}>
                    OFFLINE ON-PHONE 🔒
                  </Text>
                </TouchableOpacity>
              </View>

              {/* When Online / Cloud Mode is Selected: Clean summary card (NO models shown) */}
              {connectionMode === 'hybrid' ? (
                <View style={[styles.cloudInfoCard, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.06)' : 'rgba(101, 163, 13, 0.08)', borderColor: isDark ? 'rgba(195, 244, 0, 0.25)' : 'rgba(101, 163, 13, 0.25)' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="flash" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                    <Text style={[styles.cloudInfoTitle, { color: isDark ? '#c3f400' : '#65a30d' }]}>Ultra-Fast 120B Cloud AI Active</Text>
                  </View>
                  <Text style={[styles.cloudInfoDesc, { color: colors.textSecondary }]}>
                    • 0 MB storage used on your phone.{'\n'}
                    • Instant responses with multi-model automatic failover.{'\n'}
                    • Full personalized calorie, protein, workout and recovery coaching.
                  </Text>
                </View>
              ) : (
                /* When Offline Mode is Selected: Show Models and Pause/Resume/Cancel Manager */
                <View style={{ gap: 10 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>OFFLINE MODEL SELECTION</Text>
                  
                  {/* 1. Light & Fast Mode (Qwen 0.5B) */}
                  <TouchableOpacity
                    style={[
                      styles.modelCard,
                      { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle },
                      modelPref === '0.5b' && { borderColor: isDark ? '#c3f400' : '#65a30d', backgroundColor: isDark ? 'rgba(195, 244, 0, 0.05)' : 'rgba(101, 163, 13, 0.08)' }
                    ]}
                    onPress={async () => {
                      setModelPref('0.5b');
                      await AsyncStorage.setItem('fitpulse_ai_model_pref', '0.5b');
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[
                        styles.modelCardTitle, 
                        { color: colors.text },
                        modelPref === '0.5b' && { color: isDark ? '#c3f400' : '#65a30d' }
                      ]}>
                        Light & Fast Mode
                      </Text>
                      <Text style={[styles.modelCardBadge, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(101, 163, 13, 0.15)', color: isDark ? '#c3f400' : '#65a30d' }]}>~644 MB</Text>
                    </View>
                    <Text style={[styles.modelCardDesc, { color: colors.textSecondary }]}>
                      Fastest on-device model. Ideal for all phones with lower battery/RAM usage.
                    </Text>
                  </TouchableOpacity>

                  {/* 2. Smart & Detailed Mode (Gemma 1B) */}
                  <TouchableOpacity
                    style={[
                      styles.modelCard,
                      { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle },
                      modelPref === 'gemma-3-1b' && { borderColor: isDark ? '#c3f400' : '#65a30d', backgroundColor: isDark ? 'rgba(195, 244, 0, 0.05)' : 'rgba(101, 163, 13, 0.08)' }
                    ]}
                    onPress={async () => {
                      setModelPref('gemma-3-1b');
                      await AsyncStorage.setItem('fitpulse_ai_model_pref', 'gemma-3-1b');
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[
                        styles.modelCardTitle, 
                        { color: colors.text },
                        modelPref === 'gemma-3-1b' && { color: isDark ? '#c3f400' : '#65a30d' }
                      ]}>
                        Smart & Detailed Mode
                      </Text>
                      <Text style={[styles.modelCardBadge, { backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }]}>~769 MB</Text>
                    </View>
                    <Text style={[styles.modelCardDesc, { color: colors.textSecondary }]}>
                      Advanced coaching with deeper reasoning for diet and workout scheduling.
                    </Text>
                  </TouchableOpacity>

                  {/* Offline Download / Pause / Resume / Delete Status Manager */}
                  <View style={[styles.downloadStatusCard, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.downloadStatusLabel, { color: colors.text }]}>
                        STATUS: {isDownloaded ? 'READY TO USE ✅' : downloadStatus === 'paused' ? 'PAUSED ⏸️' : downloadStatus === 'downloading' ? 'DOWNLOADING ⬇️' : 'NOT DOWNLOADED ❌'}
                      </Text>
                      {isDownloaded && (
                        <TouchableOpacity onPress={handleDeleteOrCancelModel}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {downloadStatus === 'downloading' ? (
                      <View style={styles.progressContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                            {downloadProgressText || `Downloading: ${downloadProgress}%`}
                          </Text>
                          <ActivityIndicator size="small" color={isDark ? "#c3f400" : "#65a30d"} />
                        </View>
                        <View style={[styles.barOutline, { backgroundColor: colors.borderSubtle }]}>
                          <View style={[styles.barFill, { width: `${downloadProgress}%`, backgroundColor: isDark ? '#c3f400' : '#65a30d' }]} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                          <TouchableOpacity style={[styles.btnActionSmall, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]} onPress={handlePauseDownload}>
                            <Ionicons name="pause" size={12} color={isDark ? "#051424" : "#ffffff"} />
                            <Text style={[styles.btnActionSmallText, { color: isDark ? '#051424' : '#ffffff' }]}>Pause</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.btnActionSmall, { backgroundColor: '#ef4444' }]} onPress={handleDeleteOrCancelModel}>
                            <Ionicons name="close" size={12} color="#ffffff" />
                            <Text style={[styles.btnActionSmallText, { color: '#ffffff' }]}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : downloadStatus === 'paused' ? (
                      <View style={styles.progressContainer}>
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>{downloadProgressText || `Paused at ${downloadProgress}%`}</Text>
                        <View style={[styles.barOutline, { backgroundColor: colors.borderSubtle }]}>
                          <View style={[styles.barFill, { width: `${downloadProgress}%`, backgroundColor: '#38bdf8' }]} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                          <TouchableOpacity style={[styles.btnActionSmall, { backgroundColor: '#38bdf8' }]} onPress={handleStartOrResumeDownload}>
                            <Ionicons name="play" size={12} color="#051424" />
                            <Text style={styles.btnActionSmallText}>Resume</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.btnActionSmall, { backgroundColor: '#ef4444' }]} onPress={handleDeleteOrCancelModel}>
                            <Ionicons name="close" size={12} color="#ffffff" />
                            <Text style={[styles.btnActionSmallText, { color: '#ffffff' }]}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      !isDownloaded && (
                        <TouchableOpacity style={[styles.btnDownload, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]} onPress={handleStartOrResumeDownload}>
                          <Ionicons name="cloud-download-outline" size={16} color={isDark ? "#051424" : "#ffffff"} style={{ marginRight: 6 }} />
                          <Text style={[styles.btnDownloadText, { color: isDark ? '#051424' : '#ffffff' }]}>DOWNLOAD ({MODEL_DISPLAY_INFO[modelPref].size})</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>
              )}

              <TouchableOpacity style={[styles.btnSaveSettings, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]} onPress={() => setSettingsVisible(false)}>
                <Text style={[styles.btnSaveSettingsText, { color: colors.text }]}>SAVE & CLOSE</Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  onlineBadge: {
    backgroundColor: 'rgba(195, 244, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  onlineBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#c3f400',
  },
  iconBtn: {
    padding: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rolesContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
  },
  rolesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleChipActive: {
    backgroundColor: '#c3f400',
    borderColor: '#c3f400',
  },
  roleLabel: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    letterSpacing: 0.3,
  },
  roleLabelActive: {
    color: '#051424',
    fontWeight: '700',
  },
  chatScroll: {
    padding: 16,
    paddingBottom: 24,
  },
  offlineAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  offlineAlertTitle: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  offlineAlertDesc: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  btnBannerDownload: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnBannerDownloadText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#051424',
  },
  assessmentSection: {
    backgroundColor: 'rgba(13, 28, 45, 0.6)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  assessmentToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  assessmentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assessmentToggleTitle: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  assessmentCards: {
    padding: 12,
    paddingTop: 0,
    gap: 8,
  },
  assessCard: {
    backgroundColor: 'rgba(5, 20, 36, 0.5)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  assessCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assessCardTitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#c3f400',
    letterSpacing: 0.5,
  },
  assessCardBody: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 15,
  },
  btnReassess: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnReassessText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#c3f400',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  messageLeft: {
    alignSelf: 'flex-start',
  },
  messageRight: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c3f400',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  aiBubble: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  userBubble: {
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.3)',
  },
  bubbleText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#f8fafc',
    lineHeight: 19,
  },
  bubbleTime: {
    fontFamily: 'Inter',
    fontSize: 8,
    color: '#64748B',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  actionsBox: {
    marginTop: 6,
    backgroundColor: 'rgba(5, 20, 36, 0.7)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 8,
    gap: 6,
  },
  actionsHeader: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 2,
  },
  actionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 8,
  },
  actionCardTitle: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionCardTime: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  actionCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c3f400',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionCardBtnAdded: {
    backgroundColor: 'rgba(195, 244, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#c3f400',
  },
  actionCardBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#051424',
  },
  actionCardBtnTextAdded: {
    color: '#c3f400',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingLeft: 32,
  },
  loaderText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94a3b8',
  },
  stopGeneratingBar: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  btnStopGenerating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  btnStopGeneratingText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  presetsWrapper: {
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  presetsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  presetPrompt: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetPromptText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#cbd5e1',
  },
  inputPanel: {
    backgroundColor: '#051424',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  inputTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    height: 40,
    color: '#ffffff',
    fontFamily: 'Inter',
    fontSize: 13,
    paddingHorizontal: 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#c3f400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#0d1c2d',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 8,
  },
  modalTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  historyBadge: {
    backgroundColor: 'rgba(195, 244, 0, 0.15)',
    color: '#c3f400',
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  btnNewChat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c3f400',
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  btnNewChatText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  historyCardActive: {
    borderColor: '#c3f400',
    backgroundColor: 'rgba(195, 244, 0, 0.06)',
  },
  historyTitle: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  historyTime: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: '#64748b',
    marginLeft: 6,
  },
  historySnippet: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  historyDeleteBtn: {
    padding: 6,
  },
  btnClearHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  btnClearHistoryText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  fieldLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#334155',
  },
  toggleBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#c3f400',
  },
  cloudInfoCard: {
    backgroundColor: 'rgba(195, 244, 0, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.25)',
    borderRadius: 8,
    padding: 12,
  },
  cloudInfoTitle: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#c3f400',
  },
  cloudInfoDesc: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  downloadStatusCard: {
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  downloadStatusLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  progressContainer: {
    gap: 6,
  },
  progressText: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#94a3b8',
  },
  barOutline: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#c3f400',
  },
  btnActionSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c3f400',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
  },
  btnActionSmallText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#051424',
  },
  btnDownload: {
    flexDirection: 'row',
    backgroundColor: '#c3f400',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDownloadText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#051424',
  },
  btnSaveSettings: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnSaveSettingsText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  modelCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
  },
  modelCardActive: {
    borderColor: '#c3f400',
    backgroundColor: 'rgba(195, 244, 0, 0.05)',
  },
  modelCardTitle: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  modelCardTitleActive: {
    color: '#c3f400',
  },
  modelCardBadge: {
    backgroundColor: 'rgba(195, 244, 0, 0.15)',
    color: '#c3f400',
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modelCardDesc: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 14,
  },
  tutorialContent: {
    width: '100%',
    backgroundColor: '#0d1c2d',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    padding: 20,
  },
  welcomeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    borderWidth: 1,
    borderColor: '#c3f400',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tutorialTitle: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  tutorialSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
  },
  tutorialOptionCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: '#c3f400',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  tutorialOptionTitle: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#c3f400',
  },
  tutorialOptionDesc: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  tutorialBadgeGreen: {
    backgroundColor: 'rgba(195, 244, 0, 0.15)',
    color: '#c3f400',
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  btnStartNow: {
    backgroundColor: '#c3f400',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  btnStartNowText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#051424',
  },
  tutorialFooterText: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
});
