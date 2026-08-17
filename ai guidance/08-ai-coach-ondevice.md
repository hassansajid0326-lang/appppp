# FitPulse — AI Coach: On-Device Implementation Spec (Phase 2)

**Decision, locked in:** AI Coach runs entirely on-device. No cloud LLM call anywhere in this feature — no OpenAI/Anthropic/DashScope, no self-hosted server model, no network dependency for inference. This trades away larger-model reasoning quality for zero API cost, zero third-party data exposure, and offline availability by default.

## 1. Model

| | |
|---|---|
| Model | Qwen2.5-0.5B-Instruct |
| Format | GGUF, Q4_K_M quantization |
| Size | ~398MB |
| License | Apache 2.0 (commercial use fine) |
| Source | Hugging Face: `Qwen/Qwen2.5-0.5B-Instruct-GGUF` |
| Runtime | `llama.rn` (React Native bindings for llama.cpp) |

Reference: [ollama.com/library/qwen2.5](https://ollama.com/library/qwen2.5) is useful for confirming model variants/sizes, but Ollama itself is a desktop/server tool and is **not** part of the app — the app pulls the same underlying GGUF weight file directly via Hugging Face and runs it through `llama.rn`, not Ollama.

## 2. Why 0.5B, and what that means for scope

This is the smallest Qwen2.5 variant. It's fast and small enough to be realistic on-device across most phones, but it is **not** capable of the kind of multi-factor reasoning implied by the original `ai_coach` mockup (HRV trend interpretation, metabolic-window timing, adaptive periodization). Design the feature around what a 0.5B instruct model can reliably do:

**Good fit:**
- Answering short, specific questions grounded in data you hand it directly ("Based on today's log, how many calories do I have left?")
- Simple substitutions ("Suggest an alternative to Bench Press using dumbbells")
- Short summaries of pre-computed stats you feed it (don't make it calculate trends itself — compute the numbers in code, have the model phrase them)

**Bad fit — don't build these against this model:**
- Open-ended multi-week program design
- Anything requiring it to do arithmetic across many data points itself (it will get numbers wrong — compute in JS/Express-side formulas, pass results in, let the model only phrase the sentence)
- Long back-and-forth conversations relying on it remembering earlier turns accurately (keep context windows short and re-inject key facts each turn)

## 3. Setup

```bash
npm install llama.rn react-native-fs @react-native-community/netinfo
cd ios && pod install
```

Android: modern React Native/Expo handles NDK config automatically — verify `android/app/build.gradle` if using a bare workflow.

`@react-native-community/netinfo` is used for the Wi-Fi-download gate below, not for any online/offline model routing — there is no cloud fallback to route to.

## 4. Model Download (first use, not first launch)

Don't download on install — only when the user first opens AI Coach, and gate it on Wi-Fi.

```javascript
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';

const MODEL_URL = "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf";
// Caches, not Documents — avoids bloating iCloud backups with a re-downloadable file
const MODEL_PATH = `${RNFS.CachesDirectoryPath}/qwen-0.5b.gguf`;
const EXPECTED_MIN_SIZE = 350 * 1024 * 1024; // sanity check floor, adjust to actual published size

export async function downloadModel(onProgress) {
  const exists = await RNFS.exists(MODEL_PATH);
  if (exists) {
    const stat = await RNFS.stat(MODEL_PATH);
    if (stat.size > EXPECTED_MIN_SIZE) return MODEL_PATH; // looks complete, reuse
    await RNFS.unlink(MODEL_PATH); // partial/corrupt leftover, remove and re-download
  }

  const netState = await NetInfo.fetch();
  if (netState.type !== 'wifi') {
    throw new Error('WIFI_REQUIRED'); // surface a UI prompt: "Connect to Wi-Fi to download AI Coach (398MB)"
  }

  const fsInfo = await RNFS.getFSInfo();
  if (fsInfo.freeSpace < 600 * 1024 * 1024) { // model size + working headroom
    throw new Error('INSUFFICIENT_STORAGE');
  }

  const download = RNFS.downloadFile({
    fromUrl: MODEL_URL,
    toFile: MODEL_PATH,
    progress: (res) => onProgress?.((res.bytesWritten / res.contentLength) * 100),
  });

  const result = await download.promise;
  if (result.statusCode !== 200) {
    await RNFS.unlink(MODEL_PATH).catch(() => {});
    throw new Error('DOWNLOAD_FAILED');
  }

  const stat = await RNFS.stat(MODEL_PATH);
  if (stat.size < EXPECTED_MIN_SIZE) {
    await RNFS.unlink(MODEL_PATH).catch(() => {});
    throw new Error('DOWNLOAD_INCOMPLETE');
  }

  return MODEL_PATH;
}
```

UI needs states for: not downloaded (show download prompt + size), downloading (progress bar), failed (retry, with the specific reason — no Wi-Fi / no storage / corrupted), ready.

## 5. Model Lifecycle (init once, release on background)

```javascript
import { AppState, Platform } from 'react-native';
import { initLlama } from 'llama.rn';
import RNFS from 'react-native-fs';

let llamaContext = null;

export async function getModelContext() {
  if (llamaContext) return llamaContext;

  const MODEL_PATH = `${RNFS.CachesDirectoryPath}/qwen-0.5b.gguf`;
  llamaContext = await initLlama({
    model: MODEL_PATH,
    use_mlock: true,
    n_ctx: 2048,
    n_gpu_layers: Platform.OS === 'ios' ? 99 : 0, // Metal offload on iOS, CPU on Android
  });
  return llamaContext;
}

AppState.addEventListener('change', (nextState) => {
  if (nextState === 'background' && llamaContext) {
    llamaContext.release();
    llamaContext = null; // reload cost (2-4s) accepted in exchange for not holding ~1GB+ RAM in background
  }
});
```

## 6. Context Assembly (this matters more than the model)

Don't hand the model raw logs — it'll burn context budget and may miscalculate. **Pre-compute summary stats in code**, then hand the model a compact, already-correct summary to phrase into a response:

```javascript
function buildContextSummary(recentLogs) {
  // recentLogs computed from local cache (see below), not raw rows
  return `Steps: avg ${recentLogs.avgSteps}/day this week. ` +
         `Workouts: ${recentLogs.workoutCount} logged this week. ` +
         `Weight: ${recentLogs.currentWeight}kg, ${recentLogs.weightTrend} over 2 weeks. ` +
         `Calories today: ${recentLogs.caloriesLogged}/${recentLogs.calorieTarget} target.`;
}
```

**Where does `recentLogs` come from offline?** The AI Coach needs to read the user's own data even with no connection. For MVP-of-this-feature, a full bidirectional sync engine (e.g. WatermelonDB) is more than this needs — a lightweight local cache is enough:

- On every app foreground while online, write a small aggregated JSON summary (not raw rows) to `AsyncStorage` or `expo-sqlite`
- AI Coach reads that cached summary — no live Supabase call required
- Only build a full offline-write sync layer (WatermelonDB) later, and only if offline *logging* (not just offline *reading*) becomes an actual requirement — that's a materially bigger build, don't take it on speculatively

## 7. Inference Call

```javascript
export async function askAICoach(userPrompt, contextSummary, onToken) {
  const context = await getModelContext();

  const prompt = `<|im_start|>system
You are a concise offline fitness assistant. Use only the data provided. Keep answers short and specific. If asked for medical advice, say to consult a professional.<|im_end|>
<|im_start|>user
Data: ${contextSummary}
Question: ${userPrompt}<|im_end|>
<|im_start|>assistant
`;

  const result = await context.completion(
    { prompt, n_predict: 150, temperature: 0.6, stop: ['<|im_end|>', '<|endoftext|>'] },
    (data) => onToken?.(data.token) // wire to a state setter for streaming UI
  );

  return result.text;
}
```

`temperature: 0.6` (lower than a default 0.7-0.8) — a small model rambles more at higher temperature; keep it tighter for a coaching-tone feature.

## 8. Two Separate Prompt Shapes (per PRD's two AI Coach features)

- **Chat (interactive Q&A):** prompt above — user asks, model answers from the summary
- **Progress check (structured, not conversational):** different system prompt asking for a fixed shape — "State one thing that improved, one that didn't, and one specific suggestion, each in one short sentence" — render as 3 cards in the UI rather than a paragraph; more reliable output from a small model than open-ended prose

## 9. Non-Negotiables Before This Ships

- Visible "AI-generated, not medical advice" disclaimer on every AI Coach screen
- Real-device testing on a **low-end/older Android phone**, not just team dev phones — this is where quality/performance/battery problems will actually show up
- A clear empty/failure state for "model not downloaded yet" and "download failed" — this feature has more setup friction than a typical screen, the UX needs to account for that honestly
