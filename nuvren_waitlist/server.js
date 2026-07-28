const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'waitlist_data.json');
const CONFIG_FILE = path.join(__dirname, 'admin_config.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Helper: Get Admin Config
function getConfig() {
  const defaultConfig = {
    adminPassword: process.env.ADMIN_PASSWORD || 'admin',
    notificationEmail: 'nuvren.team@gmail.com',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      user: process.env.SMTP_USER || 'nuvren.team@gmail.com',
      pass: process.env.SMTP_PASS || ''
    }
  };

  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return { ...defaultConfig, ...parsed };
  } catch (err) {
    console.error('Error reading admin config:', err);
    return defaultConfig;
  }
}

// Helper: Save Admin Config
function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch (err) {
    console.error('Error saving admin config:', err);
  }
}

// Helper: Read Waitlist DB
function getWaitlistData() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading waitlist DB:', err);
    return [];
  }
}

// Helper: Save Waitlist DB
function saveWaitlistData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving waitlist DB:', err);
  }
}

// Helper: Send Notification Email to nuvren.team@gmail.com
async function sendNotificationEmail(entry) {
  const cfg = getConfig();
  const targetEmail = cfg.notificationEmail || 'nuvren.team@gmail.com';
  const smtpPass = cfg.smtp?.pass || process.env.SMTP_PASS;
  const smtpUser = cfg.smtp?.user || process.env.SMTP_USER || 'nuvren.team@gmail.com';

  if (!smtpPass) {
    console.log(`[Email Note] Signup saved. (SMTP password not configured yet in Admin Settings for email dispatch to ${targetEmail})`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.smtp?.host || 'smtp.gmail.com',
      port: cfg.smtp?.port || 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const mailOptions = {
      from: `"Nuvren Waitlist Bot" <${smtpUser}>`,
      to: targetEmail,
      subject: `🎉 New Waitlist Signup: ${entry.name} (${entry.role})`,
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #dce9e1; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0c5f35; margin-top: 0;">🎉 New Nuvren Waitlist Signup</h2>
          <p style="color: #516c5f; font-size: 15px;">A new user has just reserved their early access spot on Nuvren!</p>
          <hr style="border: none; border-top: 1px solid #dce9e1; margin: 15px 0;" />
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #516c5f; font-weight: bold;">Full Name:</td>
              <td style="padding: 8px 0; color: #09241d;">${entry.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #516c5f; font-weight: bold;">Email Address:</td>
              <td style="padding: 8px 0; color: #0c5f35; font-weight: bold;"><a href="mailto:${entry.email}">${entry.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #516c5f; font-weight: bold;">Joining As:</td>
              <td style="padding: 8px 0; color: #09241d;"><span style="background: #dce9e1; color: #0c5f35; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px;">${entry.role}</span></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #516c5f; font-weight: bold;">Signup ID:</td>
              <td style="padding: 8px 0; color: #77948c;">${entry.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #516c5f; font-weight: bold;">Joined Date:</td>
              <td style="padding: 8px 0; color: #77948c;">${new Date(entry.createdAt).toLocaleString()}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #dce9e1; margin: 20px 0 15px;" />
          <p style="font-size: 12px; color: #77948c; margin: 0;">This email notification was sent automatically by your Nuvren Waitlist Backend Server.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Admin Email Sent] Notification sent to ${targetEmail} for ${entry.email}`);
  } catch (err) {
    console.error(`[Admin Email Error] Failed sending email to ${targetEmail}:`, err.message);
  }
}

// Helper: Send Automatic Welcome Confirmation Email to the user who signed up
async function sendUserWelcomeEmail(entry) {
  const cfg = getConfig();
  const smtpPass = cfg.smtp?.pass || process.env.SMTP_PASS;
  const smtpUser = cfg.smtp?.user || process.env.SMTP_USER || 'nuvren.team@gmail.com';

  if (!smtpPass) return;

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.smtp?.host || 'smtp.gmail.com',
      port: cfg.smtp?.port || 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const userFirstName = entry.name && entry.name !== 'Anonymous' ? entry.name.split(' ')[0] : 'there';

    const mailOptions = {
      from: `"Nuvren Team" <${smtpUser}>`,
      to: entry.email,
      replyTo: "nuvren.team@gmail.com",
      subject: `Welcome to Nuvren Early Access, ${userFirstName}!`,
      text: `Hi ${userFirstName},\n\nThank you for joining the Nuvren waitlist as a ${entry.role}! We are rebuilding recruitment and talent discovery from the ground up — creating intelligent, direct connections without the usual noise.\n\nWhat happens next?\n- We are rolling out private beta invitations in curated batches.\n- You will receive an exclusive invite code directly at this email address when your batch opens.\n- Priority access is granted on a first-come, first-served basis.\n\nIf you have any questions or ideas in the meantime, feel free to reply directly to this email.\n\nWarm regards,\nThe Nuvren Team\n\n---\nYou received this email because you signed up for early access at Nuvren.`,
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #dce9e1; border-radius: 16px; background-color: #ffffff; color: #09241d;">
          
          <!-- Header Branding -->
          <div style="margin-bottom: 24px;">
            <h1 style="font-size: 28px; font-weight: 800; color: #000000; margin: 0; letter-spacing: -0.03em;">Nuvren</h1>
          </div>

          <!-- Greeting & Headline -->
          <h2 style="font-size: 22px; font-weight: 700; color: #09241d; margin-top: 0; margin-bottom: 12px; line-height: 1.3;">
            You're on the early access priority list 🎉
          </h2>

          <p style="font-size: 15px; color: #516c5f; line-height: 1.6; margin-bottom: 18px;">
            Hi ${userFirstName},
          </p>

          <p style="font-size: 15px; color: #516c5f; line-height: 1.6; margin-bottom: 18px;">
            Thank you for joining the Nuvren waitlist as a <strong>${entry.role}</strong>! We are rebuilding recruitment and talent discovery from the ground up — creating intelligent, direct connections without the usual noise and friction.
          </p>

          <div style="background-color: #f8faf9; border: 1px solid #dce9e1; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="font-size: 15px; font-weight: 700; color: #0c5f35; margin-top: 0; margin-bottom: 8px;">What happens next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #516c5f; font-size: 14px; line-height: 1.6;">
              <li style="margin-bottom: 6px;">We are rolling out private beta invitations in curated batches.</li>
              <li style="margin-bottom: 6px;">You will receive an exclusive invite code directly at this email address when your batch opens.</li>
              <li>Priority access is granted on a first-come, first-served basis.</li>
            </ul>
          </div>

          <p style="font-size: 15px; color: #516c5f; line-height: 1.6; margin-bottom: 24px;">
            We appreciate your interest in building the future of work with us. If you have any questions or ideas in the meantime, feel free to reply directly to this email!
          </p>

          <hr style="border: none; border-top: 1px solid #dce9e1; margin: 24px 0;" />

          <p style="font-size: 14px; color: #09241d; font-weight: 600; margin: 0; margin-bottom: 16px;">
            Warm regards,<br>
            <span style="color: #0c5f35;">The Nuvren Team</span>
          </p>

          <p style="font-size: 11px; color: #77948c; margin: 0; line-height: 1.4;">
            You are receiving this automated email because you signed up for early access on the Nuvren waitlist.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[User Welcome Email Sent] Sent welcome email to user: ${entry.email}`);
  } catch (err) {
    console.error(`[User Welcome Email Error] Failed to send welcome email to ${entry.email}:`, err.message);
  }
}

// API: Submit Waitlist Entry
app.post('/api/waitlist', async (req, res) => {
  const { name, email, role } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email address is required.' });
  }

  const entries = getWaitlistData();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || '').trim() || 'Anonymous';
  const cleanRole = (role || '').trim() || 'Job Seeker';

  const existingIndex = entries.findIndex(e => e.email.toLowerCase() === cleanEmail);

  if (existingIndex !== -1) {
    entries[existingIndex].name = cleanName;
    entries[existingIndex].role = cleanRole;
    entries[existingIndex].updatedAt = new Date().toISOString();
    saveWaitlistData(entries);

    // Send emails asynchronously
    sendNotificationEmail(entries[existingIndex]).catch(() => {});
    sendUserWelcomeEmail(entries[existingIndex]).catch(() => {});

    return res.json({ success: true, message: 'Waitlist spot updated successfully.', entry: entries[existingIndex] });
  }

  const newEntry = {
    id: 'W-' + Date.now().toString(36).toUpperCase(),
    name: cleanName,
    email: cleanEmail,
    role: cleanRole,
    createdAt: new Date().toISOString()
  };

  entries.unshift(newEntry);
  saveWaitlistData(entries);

  console.log(`[+] New Signup: ${cleanName} (${cleanEmail}) - ${cleanRole}`);
  
  // Trigger background emails: 1 to Nuvren Admin, 1 Welcome Email to User
  sendNotificationEmail(newEntry).catch(() => {});
  sendUserWelcomeEmail(newEntry).catch(() => {});

  res.status(201).json({ success: true, message: 'Successfully joined the waitlist!', entry: newEntry });
});

// API: Admin Login Verification
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const cfg = getConfig();

  if (password === cfg.adminPassword) {
    res.json({ success: true, token: cfg.adminPassword });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect admin password.' });
  }
});

// API: Change Admin Password
app.post('/api/admin/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const cfg = getConfig();

  if (currentPassword !== cfg.adminPassword) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, error: 'New password must be at least 4 characters long.' });
  }

  cfg.adminPassword = newPassword.trim();
  saveConfig(cfg);

  console.log(`[🔑 Admin Security] Admin password updated successfully.`);
  res.json({ success: true, message: 'Password updated successfully!', newPassword: cfg.adminPassword });
});

// API: Update Email Notification Settings
app.post('/api/admin/update-settings', (req, res) => {
  const { password, notificationEmail, smtpPass } = req.body;
  const cfg = getConfig();

  if (password !== cfg.adminPassword) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  if (notificationEmail) cfg.notificationEmail = notificationEmail.trim();
  if (smtpPass !== undefined) cfg.smtp.pass = smtpPass.trim();

  saveConfig(cfg);
  res.json({ success: true, message: 'Settings saved successfully.', config: { notificationEmail: cfg.notificationEmail, hasSmtpPass: Boolean(cfg.smtp.pass) } });
});

// API: Get All Submissions (Admin Protected)
app.get('/api/admin/submissions', (req, res) => {
  const authHeader = req.headers.authorization || req.query.password;
  const cfg = getConfig();

  if (authHeader !== cfg.adminPassword) {
    return res.status(401).json({ success: false, error: 'Unauthorized access.' });
  }

  const entries = getWaitlistData();
  res.json({ 
    success: true, 
    count: entries.length, 
    data: entries,
    config: {
      notificationEmail: cfg.notificationEmail,
      hasSmtpPass: Boolean(cfg.smtp?.pass)
    }
  });
});

// API: Export Submissions to CSV
app.get('/api/admin/export', (req, res) => {
  const pass = req.query.password;
  const cfg = getConfig();

  if (pass !== cfg.adminPassword) {
    return res.status(401).send('Unauthorized export access.');
  }

  const entries = getWaitlistData();
  let csv = 'ID,Name,Email,Role,Joined At\n';
  
  entries.forEach(item => {
    const safeName = `"${(item.name || '').replace(/"/g, '""')}"`;
    const safeEmail = `"${(item.email || '').replace(/"/g, '""')}"`;
    const safeRole = `"${(item.role || '').replace(/"/g, '""')}"`;
    const joined = `"${item.createdAt || ''}"`;
    csv += `${item.id},${safeName},${safeEmail},${safeRole},${joined}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=nuvren_waitlist_${Date.now()}.csv`);
  res.send(csv);
});

// Fallback route to serve index.html for root navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  const cfg = getConfig();
  console.log(`\n==================================================`);
  console.log(`🚀 Nuvren Waitlist Server running at http://localhost:${PORT}`);
  console.log(`📊 Admin Portal available at http://localhost:${PORT}/admin.html`);
  console.log(`✉️  Notification Email target: ${cfg.notificationEmail}`);
  console.log(`==================================================\n`);
});
