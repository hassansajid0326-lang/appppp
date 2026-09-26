import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import { AppState, Platform } from 'react-native';
import { useOfflineStore } from './offlineStore';

// Dynamic import of llama.rn native module
let initLlama: any = null;
try {
  initLlama = require('llama.rn').initLlama;
} catch (e) {
  console.log('Llama.rn not loaded yet');
}

export type AICoachRole = 'doctor' | 'trainer' | 'nutritionist' | 'wellness';
export type AIConnectionMode = 'hybrid' | 'offline_only';
export type AIModelPref = '0.5b' | 'gemma-3-1b';

export interface RoutineAction {
  title: string;
  repeat_rule?: 'daily' | 'weekly' | 'custom' | 'monthly';
  repeat_days?: number[];
  reminder_time?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | Date;
  actions?: RoutineAction[];
  actionAdded?: boolean[];
}

export interface ChatSession {
  id: string;
  title: string;
  role: AICoachRole;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const MODEL_URLS: Record<AIModelPref, string> = {
  '0.5b': 'https://github.com/hassansajid0326-lang/appppp/releases/download/v1.0.0-models/qwen-0.5b.gguf',
  'gemma-3-1b': 'https://github.com/hassansajid0326-lang/appppp/releases/download/v1.0.0-models/gemma-3-1b.gguf'
};

export const EXACT_MODEL_SIZES: Record<AIModelPref, number> = {
  '0.5b': 675710816,
  'gemma-3-1b': 806058496
};

export const EXPECTED_MIN_SIZES: Record<AIModelPref, number> = {
  '0.5b': 670 * 1024 * 1024,
  'gemma-3-1b': 800 * 1024 * 1024
};

export const MODEL_DISPLAY_INFO: Record<AIModelPref, { name: string; size: string; description: string }> = {
  '0.5b': {
    name: 'Light & Fast Mode (Qwen 0.5B)',
    size: '~644 MB',
    description: 'Fastest on-device model with low memory usage. Perfect for battery efficiency.'
  },
  'gemma-3-1b': {
    name: 'Smart & Detailed Mode (Gemma 1B)',
    size: '~769 MB',
    description: 'Advanced reasoning model for deeper diet and workout customization.'
  }
};

// Supported Groq Cloud models with automatic multi-model failover
export const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'groq/compound'
];

// Dynamic Groq Cloud API Key getter for online inference
export const getGroqApiKey = (): string => {
  return process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
};

let llamaContext: any = null;
let currentDownloadSessionId = 0;

// Get file path for GGUF model
export function getModelPath(modelPref: AIModelPref): string {
  const filename = modelPref === 'gemma-3-1b' ? 'gemma-3-1b.gguf' : `qwen-${modelPref}.gguf`;
  return `${RNFS.DocumentDirectoryPath}/${filename}`;
}

// Check if model file exists locally and is fully downloaded
export async function checkModelExists(modelPref: AIModelPref): Promise<boolean> {
  try {
    const path = getModelPath(modelPref);
    const exists = await RNFS.exists(path);
    if (exists) {
      const stat = await RNFS.stat(path);
      if (stat.size >= EXPECTED_MIN_SIZES[modelPref]) {
        return true;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
}

// Delete downloaded model to free space (Safe & Crash-Proof)
export async function deleteLocalModel(modelPref: AIModelPref): Promise<void> {
  try {
    currentDownloadSessionId++; // Invalidate active download session in JS
    const path = getModelPath(modelPref);
    const tempPath = `${path}.part`;
    await RNFS.unlink(path).catch(() => {});
    await RNFS.unlink(tempPath).catch(() => {});
    if (llamaContext) {
      try {
        llamaContext.release();
      } catch (e) {}
      llamaContext = null;
    }
  } catch (e) {
    console.log('Error deleting local model:', e);
  }
}

export interface DownloadProgressInfo {
  percent: number;
  bytesWritten: number;
  contentLength: number;
  formattedText: string;
}

// Check local model download state (complete, paused partial, or idle)
export async function getModelDownloadStatus(modelPref: AIModelPref): Promise<{
  isDownloaded: boolean;
  isPaused: boolean;
  bytesWritten: number;
  totalSize: number;
  percent: number;
  formattedText: string;
}> {
  try {
    const fullPath = getModelPath(modelPref);
    const tempPath = `${fullPath}.part`;
    const minExpected = EXPECTED_MIN_SIZES[modelPref];
    const totalSize = EXACT_MODEL_SIZES[modelPref];

    if (await RNFS.exists(fullPath)) {
      const stat = await RNFS.stat(fullPath);
      if (stat.size >= minExpected) {
        const mb = (stat.size / (1024 * 1024)).toFixed(1);
        return {
          isDownloaded: true,
          isPaused: false,
          bytesWritten: stat.size,
          totalSize: stat.size,
          percent: 100,
          formattedText: `100% (${mb} MB - Ready)`
        };
      }
    }

    if (await RNFS.exists(tempPath)) {
      const tempStat = await RNFS.stat(tempPath);
      if (tempStat.size >= minExpected) {
        // Auto-finalize if already reached full size in tempPath
        try {
          await RNFS.unlink(fullPath).catch(() => {});
          await RNFS.moveFile(tempPath, fullPath);
          const mb = (tempStat.size / (1024 * 1024)).toFixed(1);
          return {
            isDownloaded: true,
            isPaused: false,
            bytesWritten: tempStat.size,
            totalSize: tempStat.size,
            percent: 100,
            formattedText: `100% (${mb} MB - Ready)`
          };
        } catch (e) {}
      }

      if (tempStat.size > 0) {
        const percent = Math.min(99, Math.round((tempStat.size / totalSize) * 100));
        const mbWritten = (tempStat.size / (1024 * 1024)).toFixed(1);
        const mbTotal = (totalSize / (1024 * 1024)).toFixed(1);
        return {
          isDownloaded: false,
          isPaused: true,
          bytesWritten: tempStat.size,
          totalSize,
          percent,
          formattedText: `Paused: ${percent}% (${mbWritten} MB / ${mbTotal} MB)`
        };
      }
    }

    return {
      isDownloaded: false,
      isPaused: false,
      bytesWritten: 0,
      totalSize,
      percent: 0,
      formattedText: '0%'
    };
  } catch (e) {
    return {
      isDownloaded: false,
      isPaused: false,
      bytesWritten: 0,
      totalSize: EXACT_MODEL_SIZES[modelPref],
      percent: 0,
      formattedText: '0%'
    };
  }
}

// Start or Resume downloading local GGUF model (Crash-Proof & Resumable)
export async function startOrResumeDownload(
  modelPref: AIModelPref,
  onProgress: (info: DownloadProgressInfo) => void
): Promise<string> {
  const targetPath = getModelPath(modelPref);
  const tempPath = `${targetPath}.part`;

  const thisSessionId = ++currentDownloadSessionId;

  // 1. Check if already complete in targetPath
  const alreadyComplete = await checkModelExists(modelPref);
  if (alreadyComplete) {
    onProgress({
      percent: 100,
      bytesWritten: EXACT_MODEL_SIZES[modelPref],
      contentLength: EXACT_MODEL_SIZES[modelPref],
      formattedText: '100%'
    });
    return targetPath;
  }

  // 1b. Check if tempPath is already 100% complete
  try {
    if (await RNFS.exists(tempPath)) {
      const tempStat = await RNFS.stat(tempPath);
      if (tempStat.size >= EXPECTED_MIN_SIZES[modelPref]) {
        await RNFS.unlink(targetPath).catch(() => {});
        await RNFS.moveFile(tempPath, targetPath);
        onProgress({
          percent: 100,
          bytesWritten: tempStat.size,
          contentLength: tempStat.size,
          formattedText: '100% (Completed)'
        });
        return targetPath;
      }
    }
  } catch (e) {}

  // 2. Check Internet Connectivity
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    throw new Error('NO_INTERNET');
  }

  // 3. Storage Space Check
  const fsInfo = await RNFS.getFSInfo();
  const requiredBytes = EXPECTED_MIN_SIZES[modelPref] * 1.2;
  if (fsInfo.freeSpace < requiredBytes) {
    throw new Error('INSUFFICIENT_STORAGE');
  }

  // 4. Check existing downloaded bytes for Range header
  let existingBytes = 0;
  try {
    const tempExists = await RNFS.exists(tempPath);
    if (tempExists) {
      const tempStat = await RNFS.stat(tempPath);
      existingBytes = tempStat.size || 0;
    }
  } catch (e) {
    existingBytes = 0;
  }

  const downloadHeaders: Record<string, string> = {};
  if (existingBytes > 0 && existingBytes < EXACT_MODEL_SIZES[modelPref]) {
    downloadHeaders['Range'] = `bytes=${existingBytes}-`;
  }

  let serverStatusCode = 200;

  // 5. Download file
  const download = RNFS.downloadFile({
    fromUrl: MODEL_URLS[modelPref],
    toFile: tempPath,
    headers: downloadHeaders,
    progressInterval: 250,
    connectionTimeout: 60000,
    readTimeout: 120000,
    begin: (res) => {
      serverStatusCode = res.statusCode;
    },
    progress: (res) => {
      // If user paused or cancelled this session, ignore progress events
      if (currentDownloadSessionId !== thisSessionId) return;

      const totalTargetSize = EXACT_MODEL_SIZES[modelPref];
      const isPartial = serverStatusCode === 206 || existingBytes > 0;
      const currentBytesWritten = isPartial ? (existingBytes + res.bytesWritten) : res.bytesWritten;
      
      const percent = Math.min(100, Math.round((currentBytesWritten / totalTargetSize) * 100));
      const mbWritten = (currentBytesWritten / (1024 * 1024)).toFixed(1);
      const mbTotal = (totalTargetSize / (1024 * 1024)).toFixed(1);

      onProgress({
        percent,
        bytesWritten: currentBytesWritten,
        contentLength: totalTargetSize,
        formattedText: `${percent}% (${mbWritten} MB / ${mbTotal} MB)`
      });
    },
  });

  let result: any;
  try {
    result = await download.promise;
  } catch (err: any) {
    if (currentDownloadSessionId !== thisSessionId) {
      console.log('Download was paused/cancelled in JS.');
      return '';
    }
    throw err;
  }

  if (currentDownloadSessionId !== thisSessionId) {
    return '';
  }

  // 6. Verify size and finalize
  try {
    if (await RNFS.exists(tempPath)) {
      const finalStat = await RNFS.stat(tempPath);
      if (finalStat.size >= EXPECTED_MIN_SIZES[modelPref]) {
        // Move temp file to final path when fully downloaded
        await RNFS.unlink(targetPath).catch(() => {});
        await RNFS.moveFile(tempPath, targetPath);
        onProgress({
          percent: 100,
          bytesWritten: finalStat.size,
          contentLength: finalStat.size,
          formattedText: '100% (Completed)'
        });
        return targetPath;
      }
    }
  } catch (e) {}

  // Download is not yet full file (paused, interrupted, or partial chunk)
  return '';
}

// Pause active download (Safe JS-Level Invalidation)
export function pauseModelDownload(): void {
  currentDownloadSessionId++;
}

// Compile clinical/physiology context of the user
export async function compileCoachContext(userId: string): Promise<string> {
  const store = useOfflineStore.getState();
  
  // 1. Steps
  const steps = store.dailySteps;
  
  // 2. Weight
  const weight = store.latestWeightKg || 70.0;
  
  // 3. Nutrition (today)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayFood = store.foodEntries.filter(f => f.date === todayStr);
  const caloriesConsumed = todayFood.reduce((sum, item) => sum + item.calories, 0);
  const proteinConsumed = todayFood.reduce((sum, item) => sum + (item.protein_g || 0), 0);
  const carbsConsumed = todayFood.reduce((sum, item) => sum + (item.carbs_g || 0), 0);
  const fatConsumed = todayFood.reduce((sum, item) => sum + (item.fat_g || 0), 0);

  // 4. Sleep
  let sleepHours = 8;
  let sleepQuality = 'good';
  try {
    const sleepData = await AsyncStorage.getItem('fitpulse_sleep_logs');
    if (sleepData) {
      const parsed = JSON.parse(sleepData);
      if (parsed.length > 0) {
        sleepHours = parsed[0].hours;
        sleepQuality = parsed[0].quality;
      }
    }
  } catch (err) {
    console.error('Context compiler sleep read failed:', err);
  }

  // 5. Heart Rate
  let restingHr = 70;
  try {
    const hrData = await AsyncStorage.getItem('fitpulse_hr_logs');
    if (hrData) {
      const parsed = JSON.parse(hrData);
      const restingOnly = parsed.filter((item: any) => item.type === 'resting');
      if (restingOnly.length > 0) {
        restingHr = restingOnly[0].bpm;
      }
    }
  } catch (err) {
    console.error('Context compiler HR read failed:', err);
  }

  // 6. Routine checklist completion
  const todayLogs = store.routineLogs.filter(log => log.date === todayStr && log.completed);
  const totalRoutines = store.routineItems.filter(item => item.active).length;
  const routineProgress = totalRoutines > 0 ? Math.round((todayLogs.length / totalRoutines) * 100) : 0;

  // Calculate BMR and TDEE on JS side (Mifflin-St Jeor estimation for age 28, height 175cm default)
  const bmr = Math.round(10 * weight + 6.25 * 175 - 5 * 28 + 5); // Male estimation
  let activityFactor = 1.2;
  if (steps > 10000) activityFactor = 1.55;
  else if (steps > 5000) activityFactor = 1.375;

  const tdee = Math.round(bmr * activityFactor);
  const weightLossCalorieTarget = Math.max(1200, tdee - 500);
  const weightGainCalorieTarget = tdee + 400;
  const proteinTargetMin = Math.round(weight * 1.5);
  const proteinTargetMax = Math.round(weight * 2.0);
  const dailyHydrationLiters = Math.max(2.5, Math.round((weight * 0.033 + (steps > 5000 ? 0.5 : 0)) * 10) / 10);

  return `Current User Health Metrics (Today):
- Footsteps Walked: ${steps} steps
- Sleep Logged: ${sleepHours} hours (${sleepQuality} quality)
- Resting Heart Rate: ${restingHr} BPM
- Body Weight: ${weight} kg
- Daily Food Macros: ${caloriesConsumed} kcal (Protein: ${proteinConsumed}g, Carbs: ${carbsConsumed}g, Fat: ${fatConsumed}g)
- Routine Checklist Progress: ${routineProgress}% (${todayLogs.length}/${totalRoutines} habits completed)

Calculated Physiological Targets (JS-Calculated, clinically valid):
- Estimated Basal Metabolic Rate (BMR): ${bmr} kcal
- Estimated Total Daily Energy Expenditure (TDEE): ${tdee} kcal
- Recommended Calorie Target for Weight Loss: ${weightLossCalorieTarget} kcal/day
- Recommended Calorie Target for Weight Gain: ${weightGainCalorieTarget} kcal/day
- Daily Protein Target (1.5g - 2.0g/kg): ${proteinTargetMin}g to ${proteinTargetMax}g
- Daily Hydration Target: ${dailyHydrationLiters} liters`;
}

// Get the local GGUF llama.rn model context instance (Crash-Proof)
export async function getModelContext(modelPref: AIModelPref): Promise<any> {
  if (llamaContext) return llamaContext;
  if (!initLlama) {
    throw new Error('LLAMA_NOT_AVAILABLE');
  }

  const path = getModelPath(modelPref);
  const exists = await checkModelExists(modelPref);
  if (!exists) {
    throw new Error('MODEL_NOT_DOWNLOADED');
  }

  try {
    llamaContext = await initLlama({
      model: path,
      use_mlock: false, // Critical: keep false on Android to prevent SIGSEGV memory aborts
      use_mmap: true,  // Use memory mapping for smooth allocation
      n_ctx: 1024,      // Safe context window that fits in mobile RAM
      n_threads: 4,     // Balanced CPU usage
      n_gpu_layers: Platform.OS === 'ios' ? 99 : 0, // Metal acceleration on iOS only
    });
    return llamaContext;
  } catch (err: any) {
    console.log('initLlama failed:', err);
    throw new Error(`MODEL_INIT_FAILED: ${err.message || err}`);
  }
}

// Release model from memory when app goes to background
AppState.addEventListener('change', (nextState) => {
  if (nextState === 'background' && llamaContext) {
    try {
      llamaContext.release();
    } catch (e) {
      console.log('Error releasing llama context:', e);
    }
    llamaContext = null;
  }
});

// Run AI Inference with cancellation and multi-model failover
export async function askAICoach(
  userPrompt: string,
  contextSummary: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  role: AICoachRole,
  mode: AIConnectionMode,
  modelPref: AIModelPref,
  onToken?: (token: string) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  
  // 1. Resolve role system instructions with plain language
  let systemPrompt = '';
  switch (role) {
    case 'trainer':
      systemPrompt = `You are an energetic, expert Gym Trainer and Strength Coach.
Your Coaching Rules:
1. Speak in friendly, simple, and encouraging everyday words. DO NOT use confusing technical terms.
2. Design clear workout splits, sets, repetitions, warmup steps, and rest days for gym or home workouts.
3. Keep user safety first. Advise proper posture, breathing, and drinking water.
4. Reference user's active steps and energy today from their health data.`;
      break;
    case 'nutritionist':
      systemPrompt = `You are a warm, expert Dietitian and Nutritionist.
Your Nutritional Rules:
1. Explain healthy food choices, protein, calories, and water intake in simple, appetizing, everyday terms.
2. Calculate realistic calorie deficits for fat loss or surpluses for muscle gain without extreme crash diets.
3. Suggest practical meals, easy snacks, and proper hydration (water) targets based on user's weight.
4. DO NOT use confusing medical terms without explaining them simply.`;
      break;
    case 'wellness':
      systemPrompt = `You are a calm, caring Wellness and Habits Coach.
Your Coaching Rules:
1. Help users build peaceful morning/night routines, consistent sleep habits, and stress relief techniques (like deep breathing).
2. Motivate users gently to balance hard workouts with healthy rest and mindfulness.
3. Explain everything in simple, comforting, everyday language.`;
      break;
    case 'doctor':
    default:
      systemPrompt = `You are an empathetic, expert Physician and Medical Consultant.
Your Medical Guidelines:
1. Review cardiovascular indicators (resting heart rate, sleep quality, and physical fatigue) in simple, reassuring words.
2. If resting heart rate is elevated or sleep is low, advise taking a lighter rest day.
3. If warning signs like chest tightness, severe dizziness, or sharp pain occur, urgently advise visiting a hospital in person.
4. Keep explanations completely free of confusing medical jargon.`;
  }

  systemPrompt += `\nGeneral Communication Rules:
1. Language Mirroring: Always reply in the EXACT language, dialect, and script used by the user (if user speaks in Roman Urdu, reply in natural Roman Urdu; if English, reply in English; if Urdu script, reply in Urdu).
2. Complete Uncut Responses: Provide complete, comprehensive, step-by-step guides. Never leave any response half-done or cut off.
3. Zero Jargon: Use simple everyday terms so anyone can easily understand.
4. Actionable Schedule Actions: Whenever you recommend a workout exercise, walk, water reminder, or habit routine, ALWAYS append a JSON action block at the very end formatted as:
   <routine_actions>[{"title": "Name of Activity", "repeat_rule": "daily", "reminder_time": "07:30"}]</routine_actions>
   (This allows the user to add it directly to their schedule with one tap).`;

  // Check network state
  const netState = await NetInfo.fetch();
  const isOnline = !!netState.isConnected;

  // 1. Online Mode (Groq API - Ultra Fast with Multi-Model Failover)
  if (isOnline && mode === 'hybrid') {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `Current User Health Summary:\n${contextSummary}` },
      ...chatHistory.slice(-6), // Include last 6 turns for rich conversation context
      { role: 'user', content: userPrompt }
    ];

    for (const model of GROQ_MODELS) {
      if (abortSignal?.aborted) {
        return '';
      }

      try {
        const response = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getGroqApiKey()}`
            },
            body: JSON.stringify({
              model: model,
              messages: messages,
              max_tokens: 1024,
              temperature: 0.6,
              stream: false
            }),
            signal: abortSignal
          }
        );

        if (response.ok) {
          const json = await response.json();
          const text = json.choices?.[0]?.message?.content || '';
          if (text) {
            if (onToken) {
              const words = text.split(' ');
              for (let i = 0; i < words.length; i++) {
                if (abortSignal?.aborted) return text;
                onToken(words[i] + ' ');
                await new Promise(r => setTimeout(r, 15));
              }
            }
            return text;
          }
        } else {
          const errorText = await response.text();
          console.log(`Groq model ${model} response status ${response.status}:`, errorText);
        }
      } catch (apiErr: any) {
        if (apiErr.name === 'AbortError' || abortSignal?.aborted) {
          return '';
        }
        console.log(`Groq inference with ${model} failed, trying fallback:`, apiErr);
      }
    }
  }

  // 2. Offline Mode (Local llama.rn Engine)
  if (abortSignal?.aborted) return '';

  const context = await getModelContext(modelPref);
  
  let formattedPrompt = '';
  let stopTokens: string[] = [];

  if (modelPref === 'gemma-3-1b') {
    // Gemma 3 Prompt Format
    formattedPrompt = `<start_of_turn>system\n${systemPrompt}\nContext Summary:\n${contextSummary}<end_of_turn>\n`;
    chatHistory.slice(-3).forEach(msg => {
      formattedPrompt += `<start_of_turn>${msg.role === 'assistant' ? 'model' : 'user'}\n${msg.content}<end_of_turn>\n`;
    });
    formattedPrompt += `<start_of_turn>user\n${userPrompt}<end_of_turn>\n<start_of_turn>model\n`;
    stopTokens = ['<end_of_turn>', '<start_of_turn>', 'model:', 'user:'];
  } else {
    // Qwen Instruct ChatML Format
    formattedPrompt = `<|im_start|>system\n${systemPrompt}\nContext Summary:\n${contextSummary}<|im_end|>\n`;
    chatHistory.slice(-3).forEach(msg => {
      formattedPrompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
    });
    formattedPrompt += `<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;
    stopTokens = ['<|im_start|>', '<|im_end|>', '<|endoftext|>', 'user:', 'assistant:'];
  }

  let responseText = '';
  const result = await context.completion(
    {
      prompt: formattedPrompt,
      n_predict: 1000,
      temp: 0.6,
      repeat_penalty: 1.15,
      repeat_last_n: 64,
      top_p: 0.9,
      top_k: 40,
      stop: stopTokens
    },
    (data: any) => {
      if (abortSignal?.aborted) {
        return;
      }
      if (data && data.token) {
        responseText += data.token;
        onToken?.(data.token);
      }
    }
  );

  return result.text || responseText;
}

// Generate structured 3-part daily report check
export async function generateProgressAssessment(
  contextSummary: string,
  role: AICoachRole,
  mode: AIConnectionMode,
  modelPref: AIModelPref
): Promise<{ strengths: string; opportunities: string; tip: string }> {
  
  const prompt = `Based on the provided user metrics summary, generate a structured progress assessment.
Format the output EXACTLY as:
STRENGTHS: [One short sentence identifying one positive trend or met target today]
OPPORTUNITIES: [One short sentence identifying one metric that needs improvement or focus]
TIP: [One concrete, actionable fitness/diet tip based on their role]

Do not include any other conversational filler. Keep it completely raw.`;

  const responseText = await askAICoach(
    prompt,
    contextSummary,
    [],
    role,
    mode,
    modelPref
  );

  let strengths = 'Consistent logging habit established.';
  let opportunities = 'Keep walking to reach step goals.';
  let tip = 'Increase hydration level to maintain high performance.';

  // Parse response lines
  const lines = responseText.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith('STRENGTHS:')) {
      strengths = trimmed.replace(/^STRENGTHS:\s*/i, '');
    } else if (trimmed.toUpperCase().startsWith('OPPORTUNITIES:')) {
      opportunities = trimmed.replace(/^OPPORTUNITIES:\s*/i, '');
    } else if (trimmed.toUpperCase().startsWith('TIP:')) {
      tip = trimmed.replace(/^TIP:\s*/i, '');
    }
  });

  return { strengths, opportunities, tip };
}

// Multi-Session Chat Storage Management
const STORAGE_SESSIONS_KEY = 'fitpulse_ai_chat_sessions_v2';
const STORAGE_ACTIVE_SESSION_KEY = 'fitpulse_ai_active_session_id';

export async function loadAllChatSessions(): Promise<ChatSession[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_SESSIONS_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.log('Error loading chat sessions:', e);
  }
  return [];
}

export async function saveChatSessions(sessions: ChatSession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.log('Error saving chat sessions:', e);
  }
}

export async function getActiveSessionId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
  } catch (e) {
    return null;
  }
}

export async function setActiveSessionId(sessionId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, sessionId);
  } catch (e) {}
}
