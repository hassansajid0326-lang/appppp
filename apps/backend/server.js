const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend environment.');
}
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null
  }
});

async function sendOTPEmail(email, otp, purpose) {
  const title = purpose === 'signup' ? 'Verify Your FitPulse Account' : 'Reset Your FitPulse Password';
  const messageText = purpose === 'signup' 
    ? `Welcome to FitPulse! Your 8-digit verification code is: ${otp}. This code will expire in 10 minutes.`
    : `You requested a password reset. Your 8-digit verification code is: ${otp}. This code will expire in 10 minutes.`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"FitPulse System" <no-reply@fitpulse.com>',
    to: email,
    subject: title,
    text: messageText,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #051424; color: #ffffff; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #334155;">
        <h2 style="color: #c3f400; font-size: 24px; border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-top: 0; letter-spacing: 2px;">FITPULSE SECURITY PROTOCOL</h2>
        <p style="font-size: 16px; color: #cbd5e1; line-height: 1.6;">Hello,</p>
        <p style="font-size: 16px; color: #cbd5e1; line-height: 1.6;">${purpose === 'signup' ? 'Welcome to FitPulse! Use the following 8-digit verification security key to activate your athlete account:' : 'A password reset request was initiated for your athlete account. Use the following 8-digit verification security key to proceed:'}</p>
        <div style="background-color: rgba(195, 244, 0, 0.05); border: 1px solid #c3f400; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: bold; color: #c3f400; letter-spacing: 8px; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 20px;">
          This OTP code is valid for 10 minutes. If you did not initiate this request, please ignore this email or contact support.
        </p>
      </div>
    `
  };

  console.log('\n==================================================');
  console.log(`[EMAIL SEND OUT TO: ${email}]`);
  console.log(`SUBJECT: ${title}`);
  console.log(`OTP SECURITY CODE: ${otp}`);
  console.log('==================================================\n');

  if (process.env.SMTP_USER) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email successfully sent to ${email} via SMTP.`);
    } catch (err) {
      console.error('SMTP email send failed:', err.message);
    }
  }
}

function validatePasswordSecurity(password) {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[@$!%*?&]/.test(password);

  if (password.length < minLength) {
    return 'Password must be at least 8 characters long.';
  }
  if (!hasUppercase) {
    return 'Password must contain at least one uppercase letter (A-Z).';
  }
  if (!hasLowercase) {
    return 'Password must contain at least one lowercase letter (a-z).';
  }
  if (!hasDigit) {
    return 'Password must contain at least one number (0-9).';
  }
  if (!hasSpecial) {
    return 'Password must contain at least one special character (e.g. @$!%*?&).';
  }
  return null;
}

// Diagnostics / Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /api/v1/targets/calorie
 * Computes calorie and macro targets from profile data using the Mifflin-St Jeor equation.
 * Query Parameters:
 *   - age: number
 *   - sex: 'male' | 'female'
 *   - height: number (cm)
 *   - weight: number (kg)
 *   - activity: 'sedentary' | 'light' | 'moderate' | 'active'
 *   - goal: 'lose' | 'maintain' | 'gain'
 */
app.get('/api/v1/targets/calorie', (req, res) => {
  const { age, sex, height, weight, activity, goal } = req.query;

  // Set default values if not provided
  const ageVal = parseInt(age) || 28;
  const sexVal = sex || 'male';
  const heightVal = parseFloat(height) || 175;
  const weightVal = parseFloat(weight) || 75;
  const activityVal = activity || 'moderate';
  const goalVal = goal || 'maintain';

  // 1. Calculate BMR (Mifflin-St Jeor)
  let bmr = 0;
  if (sexVal === 'male') {
    bmr = 10 * weightVal + 6.25 * heightVal - 5 * ageVal + 5;
  } else {
    bmr = 10 * weightVal + 6.25 * heightVal - 5 * ageVal - 161;
  }

  // 2. Apply Activity Multiplier
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  };
  const multiplier = multipliers[activityVal] || 1.2;
  let tdee = bmr * multiplier;

  // 3. Adjust for Goal
  let targetCalories = tdee;
  if (goalVal === 'lose') {
    targetCalories -= 500; // 500 kcal deficit
  } else if (goalVal === 'gain') {
    targetCalories += 300; // 300 kcal surplus
  }

  targetCalories = Math.max(1200, Math.round(targetCalories)); // Floor of 1200 kcal

  // 4. Macro Ratios (Protein: 2g/kg, Fat: 25% of energy, remainder Carbs)
  const proteinTargetG = Math.round(weightVal * 2.0);
  const fatTargetG = Math.round((targetCalories * 0.25) / 9);
  const carbsTargetG = Math.round((targetCalories - (proteinTargetG * 4) - (fatTargetG * 9)) / 4);

  res.json({
    calories: targetCalories,
    macros: {
      protein: proteinTargetG,
      carbs: carbsTargetG,
      fat: fatTargetG
    },
    meta: {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      formula: 'Mifflin-St Jeor',
      inputs: { age: ageVal, sex: sexVal, height: heightVal, weight: weightVal, activity: activityVal, goal: goalVal }
    }
  });
});

/**
 * GET /api/v1/dashboard/summary
 * Aggregates today's metrics into a single package.
 * Expects query param `steps` (sent by phone's health API read).
 */
app.get('/api/v1/dashboard/summary', (req, res) => {
  const stepsToday = parseInt(req.query.steps) || 0;
  
  // Approximate active calories from steps (approx 0.04 kcal per step)
  const stepCalories = Math.round(stepsToday * 0.04);
  
  // Hardcoded placeholders for routine and other items until DB integration is active
  res.json({
    steps: {
      today: stepsToday,
      goal: 10000,
      pctComplete: Math.min(1, stepsToday / 10000)
    },
    nutrition: {
      targetCalories: 2200,
      loggedCalories: 1450,
      remainingCalories: 750,
      macros: {
        protein: { target: 150, logged: 110 },
        carbs: { target: 220, logged: 140 },
        fat: { target: 70, logged: 55 }
      }
    },
    routines: {
      total: 4,
      completed: 2,
      pctComplete: 0.5,
      items: [
        { id: '1', title: 'Hydration 3L', completed: true },
        { id: '2', title: 'Protein 150g', completed: true },
        { id: '3', title: 'Stretch 10m', completed: false },
        { id: '4', title: 'Sleep 8h', completed: false }
      ]
    },
    workout: {
      hasScheduledToday: true,
      todayWorkoutName: 'Upper Body Power',
      completed: false
    },
    energy: {
      activeKcal: stepCalories,
      formulaEstimateKcal: Math.round(1800 + stepCalories) // BMR + active estimate
    }
  });
});

/**
 * GET /api/v1/analytics/weight-trend
 * Returns date-bucketed weight history for charting.
 */
app.get('/api/v1/analytics/weight-trend', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  
  // Generate mock weight logs for trending
  const history = [];
  const startWeight = 78.5;
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    
    // Simulate minor fluctuations and overall weight loss trend
    const variance = (Math.sin(i / 3) * 0.4) + ((Math.random() - 0.5) * 0.2);
    const trend = (i / days) * 2.2; // overall loss
    const weight = Math.round((startWeight - trend + variance) * 10) / 10;
    
    history.push({
      date: date.toISOString().split('T')[0],
      weight_kg: weight
    });
  }

  res.json({
    currentWeight: history[history.length - 1].weight_kg,
    changeWeight: Math.round((history[history.length - 1].weight_kg - history[0].weight_kg) * 10) / 10,
    history
  });
});

/**
 * POST /api/v1/auth/signup
 * Handles server-side user registration with password policy checks & OTP generation.
 */
app.post('/api/v1/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Server-side password security policies
  const passwordError = validatePasswordSecurity(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    // Check if user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = users.find(u => u.email === email);
    let userId;

    if (existingUser) {
      // If user is already confirmed/verified, reject
      if (existingUser.email_confirmed_at || existingUser.confirmed_at) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }
      // If unconfirmed, we reuse their user ID and update their password
      userId = existingUser.id;
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password });
      if (updateError) throw updateError;
    } else {
      // Create a new unconfirmed user in Supabase
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false
      });
      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // Generate 8-digit OTP
    const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save/Update OTP in database
    const { error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        email,
        otp,
        purpose: 'signup',
        expires_at: expiresAt.toISOString()
      });

    if (otpError) throw otpError;

    // Send/log OTP email
    await sendOTPEmail(email, otp, 'signup');

    res.json({
      status: 'verification_pending',
      email,
      message: 'Verification OTP code sent to your email.'
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during registration.' });
  }
});

/**
 * POST /api/v1/auth/verify-otp
 * Verifies the 8-digit OTP for signup or forgot-password.
 */
app.post('/api/v1/auth/verify-otp', async (req, res) => {
  const { email, otp, purpose } = req.body;

  if (!email || !otp || !purpose) {
    return res.status(400).json({ error: 'Email, OTP, and purpose are required.' });
  }

  try {
    // Check for matching unverified OTP record
    const { data: records, error: queryError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('purpose', purpose)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (queryError) throw queryError;

    if (!records || records.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP code.' });
    }

    const verificationRecord = records[0];

    // Update verified status in database
    const { error: updateRecordError } = await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', verificationRecord.id);

    if (updateRecordError) throw updateRecordError;

    // If purpose is signup, confirm email in Supabase Auth
    if (purpose === 'signup') {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const user = users.find(u => u.email === email);

      if (user) {
        const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
          email_confirm: true
        });
        if (confirmError) throw confirmError;
      } else {
        return res.status(404).json({ error: 'Associated user account not found.' });
      }
    }

    res.json({
      status: 'verified',
      message: 'Code verified successfully.'
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during verification.' });
  }
});

/**
 * POST /api/v1/auth/forgot-password
 * Generates an 8-digit OTP reset code for password recovery.
 */
app.post('/api/v1/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    // Verify user exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    // Generate 8-digit OTP
    const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save/Update OTP in database
    const { error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        email,
        otp,
        purpose: 'forgot_password',
        expires_at: expiresAt.toISOString()
      });

    if (otpError) throw otpError;

    // Send/log OTP email
    await sendOTPEmail(email, otp, 'forgot_password');

    res.json({
      status: 'otp_sent',
      email,
      message: 'Password reset OTP sent to your email.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during password recovery.' });
  }
});

/**
 * POST /api/v1/auth/reset-password
 * Resets user password after verifying 8-digit OTP.
 */
app.post('/api/v1/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
  }

  // Validate new password policies
  const passwordError = validatePasswordSecurity(newPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    // Verify there is a verified OTP record for forgot_password
    const { data: records, error: queryError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('purpose', 'forgot_password')
      .eq('verified', true)
      .order('created_at', { ascending: false });

    if (queryError) throw queryError;

    if (!records || records.length === 0) {
      return res.status(400).json({ error: 'OTP has not been verified yet. Please verify the code first.' });
    }

    // Find the user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Update password in Supabase Auth
    const { error: resetError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true // Force confirmation if unconfirmed
    });

    if (resetError) throw resetError;

    // Delete verified OTP records so they cannot be reused
    await supabase
      .from('otp_verifications')
      .delete()
      .eq('email', email)
      .eq('purpose', 'forgot_password');

    res.json({
      status: 'success',
      message: 'Password reset successfully. You can now log in.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: err.message || 'Internal server error resetting password.' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`FitPulse Backend API running on port ${PORT}`);
  });
}

module.exports = app;
