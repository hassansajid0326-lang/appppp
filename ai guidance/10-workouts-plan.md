# FitPulse — Workouts System Architecture & Implementation Plan

---

## 1. Executive Summary & Vision

The **FitPulse Workouts System** transforms the app into an elite, high-performance training cockpit designed for athletes, bodybuilders, functional lifters, runners, and beginners alike. It covers **every global workout discipline** (Strength, Calisthenics, Powerlifting, Olympic Lifting, HIIT/Cardio, CrossFit/Functional, Yoga/Pilates/Mobility, Combat Conditioning, and Minimal-Equipment Home Workouts).

---

## 2. Core Modules Architecture

```
                                  WORKOUTS SYSTEM
                                         │
    ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
    ▼                  ▼                 ▼                 ▼                  ▼
1. Universal       2. Pre-Built      3. Live Active    4. Workout         5. PR Trophy
   Exercise           Workout           Session           History &          Room &
   Database           Programs          Logger            Analytics          Volume Stats
 (150+ Exercises)   (PPL, Bro, HIIT)  (Sets, Reps, Kg)  (Past Logs)        (1RM, Records)
```

---

## 3. Global Exercise Library (Categories & Comprehensive Coverage)

The library is pre-seeded with **150+ curated exercises**, with full filtering by:
- **Discipline / Category**
- **Target Muscle Group** (Chest, Back, Quads, Hamstrings, Glutes, Shoulders, Biceps, Triceps, Core, Calves, Full Body)
- **Equipment Needed** (Barbell, Dumbbell, Cable, Machine, Kettlebell, Bodyweight, Bands, Cardio Machine, Trap Bar)
- **Difficulty** (Beginner, Intermediate, Advanced)

### 🏋️ Category 1: Strength & Hypertrophy (Bodybuilding / PPL / Upper-Lower)
- **Chest:** Barbell Flat Bench Press, Incline Dumbbell Press, Decline Bench Press, Cable Chest Flyes, Incline Cable Press, Weighted Dips, Push-Ups, Pec Deck Machine, Dumbbell Pullover.
- **Back:** Conventional Deadlift, Sumo Deadlift, Barbell Bent-Over Row, Neutral-Grip Pull-ups, Wide-Grip Lat Pulldown, Single-Arm Dumbbell Row, Seated Cable Row, T-Bar Row, Face Pulls, Chest-Supported Row, Straight-Arm Pulldown, Hyperextensions.
- **Shoulders:** Barbell Overhead Press (OHP), Seated Dumbbell Shoulder Press, Arnold Press, Standing Dumbbell Lateral Raises, Cable Lateral Raises, Reverse Pec Deck (Rear Delts), Barbell Upright Row, Front Plate Raise.
- **Legs & Glutes:** Barbell Back Squat, Front Squat, Barbell Hip Thrust, Romanian Deadlift (RDL), Leg Press, Bulgarian Split Squats, Walking Dumbbell Lunges, Quad Leg Extensions, Lying Hamstring Curls, Seated Hamstring Curls, Standing Calf Raises, Seated Calf Raises, Goblet Squats, Sissy Squats.
- **Arms (Biceps/Triceps/Forearms):** Barbell Bicep Curl, Incline Dumbbell Curl, Hammer Curls, Preacher Curls, Cable EZ-Bar Curls, EZ-Bar Skullcrushers, Cable Rope Tricep Pushdowns, Overhead Cable Extension, Close-Grip Bench Press, Bench Dips, Wrist Curls, Reverse Curls.

### 🤸 Category 2: Calisthenics & Bodyweight Mastery
- Standard Push-ups, Diamond Push-ups, Archer Push-ups, Decline Push-ups, Pike Push-ups, Handstand Push-ups (HSPU).
- Strict Pull-ups, Chin-ups, Commando Pull-ups, Muscle-ups, Typewriter Pull-ups.
- Parallel Bar Dips, Ring Dips, Australian Rows (Inverted Rows).
- Core: Hanging Leg Raises, Dragon Flags, L-Sit Hold, Ab Wheel Rollouts, Hollow Body Hold, V-Ups, Russian Twists, Plank with Shoulder Taps.
- Lower Body: Pistol Squats, Sissy Squats, Nordic Hamstring Curls, Shrimp Squats.

### ⚡ Category 3: Powerlifting & Olympic Weightlifting
- The Big 3: Competition Back Squat, Competition Pause Bench Press, Competition Deadlift.
- Olympic Lifts: Snatch, Power Snatch, Hang Snatch, Clean & Jerk, Power Clean, Hang Clean, Push Jerk, Split Jerk, Push Press, Snatch High Pull, Overhead Squat.

### 🔥 Category 4: HIIT, Cardio & Metabolic Conditioning
- Treadmill Sprint Intervals, Outdoor Running / Jogging, 2000m Rowing Machine (Concept2), Assault AirBike Sprints, SkiErg, Stair Climber, Speed Rope / Double Unders, Box Jumps, Battle Ropes (Slams & Waves), Burpees, Mountain Climbers, Jumping Jacks.

### 🛡️ Category 5: Functional Fitness & CrossFit
- Wall Ball Shots, Kettlebell Swings (Russian & American), Barbell Thrusters, Kettlebell Clean & Press, Turkish Get-Up, Heavy Sled Push (Prowler), Sled Drag, Farmer's Walk, Trap Bar Carry, Sandbag Clean & Carry, Tire Flips, D-Ball Over Shoulder.

### 🧘 Category 6: Yoga, Pilates & Mobility / Recovery
- Sun Salutation (Surya Namaskar), Downward-Facing Dog, Warrior I/II/III, Pigeon Pose (Hip Opener), Cobra Pose, Cat-Cow Stretch, Child's Pose, World's Greatest Stretch, 90/90 Hip Mobility, Ankle Mobility Drills, Thoracic Spine Rotations, Foam Rolling Quads/Lats/IT Band.
- Pilates: The Hundred, Roll-Up, Single Leg Stretch, Criss-Cross, Swan Dive, Side Plank with Rotation.

### 🥊 Category 7: Combat Conditioning (Boxing & MMA)
- Shadow Boxing (3-minute rounds), Heavy Bag Power Punches, Speed Bag Rhythm, Double-End Bag, Slip & Roll Drills, Muay Thai Heavy Bag Kicks, Medicine Ball Rotational Throws.

### 🏠 Category 8: Home & Minimal Equipment (No Gym Needed)
- Bodyweight Squats, Chair Dips, Doorframe Rows, Banded Shoulder Press, Banded Bicep Curls, Banded Good Mornings, Jumping Lunges, Bear Crawls.

---

## 4. Pre-Built Training Programs (Ready to Launch)

Users can instantly launch one-click workout protocols:
1. **Push / Pull / Legs (PPL) Split** (6-Day Hypertrophy Protocol)
2. **Upper / Lower Power & Hypertrophy** (4-Day Split)
3. **Full Body Foundation** (3-Day Beginner / Intermediate Strength)
4. **Calisthenics Beast Protocol** (Strict Bodyweight Strength)
5. **Metabolic Fat Destroyer** (HIIT + Functional Circuit 25-Min)
6. **Zero-Equipment Home Workout** (15-Min Anywhere Shred)
7. **Athlete Speed & Explosiveness** (Plyometrics + Power Clean)
8. **Daily Mobility & Posture Reset** (10-Min Spine & Hip Opener)

---

## 5. Live Active Workout Logger (Feature Specs)

During a live workout, the interface switches to a **focused, high-contrast training cockpit**:
- ⏱️ **Live Session Clock:** Elapsed workout time with Pause / Resume / Finish controls.
- 📋 **Interactive Set Table:**
  - Previous set history (e.g. `Prev: 100kg × 8`).
  - Inputs for `Weight (kg/lbs)` and `Reps` (or `Duration sec` for cardio/isometric).
  - One-tap checkmark to mark set completed.
  - Auto-RPE (Rate of Perceived Exertion) rating (1-10) optional.
- ⏳ **Rest Timer Countdown:**
  - Auto-triggers upon checking off a set (customizable: 30s, 60s, 90s, 120s, 180s).
  - Quick adjustment buttons (`+30s`, `-15s`, `Skip`).
  - Haptic feedback & audio beep cue when rest time ends.
- 📊 **Real-time Live Stats:**
  - Total Session Volume (e.g., `4,850 kg lifted`).
  - Total Sets Completed.
  - Estimated 1RM (One Rep Max) calculation using Epley's Formula: $\text{1RM} = \text{Weight} \times (1 + \frac{\text{Reps}}{30})$.
- ➕ **Dynamic Adjustments:** Add new exercise mid-workout, replace exercise, delete/add sets, add notes.
- 🏆 **Celebration Summary Modal:** Confetti / celebratory kinetic badge showing volume, workout duration, calories estimate, and new Personal Records (PRs) achieved.

---

## 6. Personal Records (PRs) & History Tracker

- **Trophy Room / PR Dashboard:**
  - Auto-tracks all-time heaviest lift, highest volume, and max reps for every single exercise.
  - Highlights milestones (e.g., *"New Bench Press PR: 120kg!"*).
- **Workout Logs Calendar & History:**
  - Infinite scroll historical list of all completed sessions.
  - Detailed breakdown of every exercise, set, rep, and weight used on that day.
  - One-tap *"Repeat This Workout"* button to load past session as today's routine.

---

## 7. Visual Assets & Image Stocking Strategy

1. **Category Hero Cards:**
   - Cinematic background visuals for each category (Strength, Calisthenics, HIIT, Olympic, Functional, Yoga, Combat).
   - High-contrast dark glassmorphism overlays with Electric Lime accents.
2. **Muscle Group Badges & Icons:**
   - SVG / Vector badges highlighting Chest, Back, Shoulders, Arms, Legs, Core, Cardio.
3. **Equipment & Exercise Type Badges:**
   - Barbell, Dumbbell, Kettlebell, Cable, Bodyweight, Machine indicators.

---

## 8. Data Schema & Store Integration

### Updated `offlineStore.ts` State Additions:
```typescript
interface Exercise {
  id: string;
  name: string;
  category: 'strength' | 'calisthenics' | 'powerlifting' | 'olympic' | 'hiit' | 'functional' | 'yoga_mobility' | 'combat' | 'home';
  muscle_group: 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'full_body';
  equipment: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'kettlebell' | 'bodyweight' | 'bands' | 'cardio_machine' | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  thumbnail_url?: string;
  is_custom?: boolean;
}

interface ActiveWorkoutSession {
  id: string;
  name: string;
  started_at: string;
  duration_sec: number;
  exercises: {
    exercise_id: string;
    exercise_name: string;
    muscle_group: string;
    sets: {
      set_number: number;
      reps?: number;
      weight_kg?: number;
      duration_sec?: number;
      completed: boolean;
      rpe?: number;
    }[];
  }[];
}

interface CompletedWorkoutLog {
  id: string;
  user_id: string;
  session_name: string;
  started_at: string;
  completed_at: string;
  duration_sec: number;
  total_volume_kg: number;
  total_sets: number;
  notes?: string;
  exercises_summary: any[];
}
```

---

## 9. Phased Implementation Steps

| Phase | Milestone | Deliverables |
|---|---|---|
| **Phase 1** | **Exercise Library & Seed Engine** | • Complete 150+ universal exercise dataset<br/>• Search, category filters, muscle group tabs, equipment selector<br/>• Exercise detail modal with instructions & target muscles |
| **Phase 2** | **Workout Programs & Templates** | • 8 Pre-built ready-to-launch routine templates (PPL, Full Body, Calisthenics, HIIT, etc.)<br/>• Custom routine builder (create and save your own routines) |
| **Phase 3** | **Live Active Workout Logger** | • Full active training cockpit screen<br/>• Live timer, sets × reps × kg table, one-tap checkoff<br/>• Rest timer countdown with +30s/-15s and haptic/sound notifications<br/>• Live volume & 1RM calculator |
| **Phase 4** | **History, PRs & Celebration** | • Workout completion modal with PR badge detection<br/>• Historical session logs browser & detailed past workout viewer<br/>• Personal Records (PR) trophy tracker |
| **Phase 5** | **Offline Store & Backend Sync** | • Extend `offlineStore.ts` with workout queues<br/>• Automatic sync to Supabase `workout_sessions` & `workout_sets`<br/>• Dashboard `WorkoutCard` integration to launch workouts directly |
