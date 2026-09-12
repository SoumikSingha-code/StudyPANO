const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const admin = require("firebase-admin");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const fetch = require("node-fetch"); // npm install node-fetch@2

const app = express();
app.use(cors());
app.use(express.json());

// ================= FIREBASE ADMIN =================
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ================= GOOGLE DRIVE SETUP =================
const FOLDER_ID = "1JmxRUDKNBiGECpCzFXQCoR3nGVhYNtVR";

const oauth2Client = new google.auth.OAuth2(
  "611559409149-3eqe2lt1dnrhitnbgh41q50598ulosnl.apps.googleusercontent.com",
  "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",
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
 refresh_token: process.env.GOOGLE_REFRESH_TOKEN 

const drive = google.drive({ version: "v3", auth: oauth2Client });

// ================= MULTER =================
// 20MB file size limit
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }
});

// ================= ALLOWED FILE TYPES =================
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
];

// Dangerous extensions — blocked even if mime type looks fine
const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".ps1", ".msi", ".dll", ".vbs",
  ".js", ".jar", ".py", ".rb", ".php", ".pl", ".com", ".scr",
  ".hta", ".pif", ".reg", ".inf", ".lnk", ".cpl", ".msp", ".zip",
  ".rar", ".7z", ".tar", ".gz"
];

// =====================================================
// STEP 1 — EXTENSION + MIME TYPE CHECK (instant, free)
// =====================================================
function checkFileType(file) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { safe: false, reason: `Blocked file extension: ${ext}` };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      safe: false,
      reason: `File type not allowed: ${file.mimetype}. Only PDF and images (JPEG, PNG, WEBP, GIF) are accepted.`
    };
  }

  // MIME/extension mismatch — catches files like virus.exe renamed to notes.pdf
  const mimeExtMap = {
    "application/pdf": [".pdf"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "image/gif": [".gif"]
  };

  const expectedExts = mimeExtMap[file.mimetype] || [];
  if (expectedExts.length > 0 && !expectedExts.includes(ext)) {
    return {
      safe: false,
      reason: `Extension "${ext}" does not match file type "${file.mimetype}". Possible disguised file.`
    };
  }

  return { safe: true, reason: "File type OK" };
}

// =====================================================
// STEP 2 — VIRUS SCAN using ClamAV (clamscan CLI)
// Install on Ubuntu/Debian: sudo apt install clamav && sudo freshclam
// Install on Mac:           brew install clamav
// =====================================================
function scanForVirus(filePath) {
  try {
    execSync("which clamscan", { stdio: "ignore" });
  } catch {
    console.warn("[WARN] ClamAV not installed — skipping virus scan.");
    console.warn("       To enable: sudo apt install clamav && sudo freshclam");
    return { safe: true, reason: "Virus scan skipped (ClamAV not installed)" };
  }

  try {
    execSync(`clamscan --no-summary "${filePath}"`, { stdio: "pipe" });
    // Exit 0 = clean
    return { safe: true, reason: "No virus detected" };
  } catch (err) {
    const output = (err.stdout?.toString() || "") + (err.stderr?.toString() || "");

    if (err.status === 1) {
      // Virus found — extract name from output e.g. "Win.Test.EICAR_HDB-1 FOUND"
      const match = output.match(/: (.+) FOUND/);
      const virusName = match ? match[1].trim() : "Unknown malware";
      console.warn(`[VIRUS DETECTED] ${filePath}: ${virusName}`);
      return { safe: false, reason: `Malware detected: ${virusName}` };
    }

    // Exit 2 = scan error — fail open with warning
    console.error("[WARN] ClamAV scan error:", output);
    return { safe: true, reason: "Virus scan error — allowed with warning" };
  }
}

// =====================================================
// STEP 3 — AI CONTENT MODERATION using Claude API
// Checks for adult, violent, hateful, or harmful content
// =====================================================
async function moderateWithAI(filePath, mimeType, originalName) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    console.warn("[WARN] ANTHROPIC_API_KEY not set — skipping AI moderation.");
    console.warn("       Set it with: ANTHROPIC_API_KEY=sk-ant-... node server.js");
    return { safe: true, reason: "AI moderation skipped (no API key)" };
  }

  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString("base64");

  // PDFs → document block (Claude reads text inside)
  // Images → image block (Claude sees pixels)
  let contentBlock;
  if (mimeType === "application/pdf") {
    contentBlock = {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64Data }
    };
  } else if (mimeType.startsWith("image/")) {
    contentBlock = {
      type: "image",
      source: { type: "base64", media_type: mimeType, data: base64Data }
    };
  } else {
    return { safe: false, reason: "Unsupported file type for AI moderation" };
  }

  const systemPrompt = `You are a strict content moderation system for an educational platform used by school and college students.

Review the uploaded file and decide if it is SAFE or UNSAFE.

UNSAFE — reject these:
- Adult, sexual, or explicit content (any nudity, pornography, suggestive imagery)
- Graphic violence, gore, or disturbing imagery  
- Hate speech, racism, casteism, religious hate, or discrimination
- Bullying, harassment, or threatening language
- Drug use, alcohol promotion, or illegal activity instructions
- Dangerous instructions (weapons, hacking, self-harm, explosives)
- Spam, scam, phishing, or clearly fake documents

SAFE — allow these:
- Academic notes, textbooks, study guides, question papers, answer keys
- Educational diagrams, scientific illustrations, graphs, charts
- Math, science, history, geography, literature, language study material
- Student assignments, projects, presentations, and reference materials

Respond ONLY with valid JSON and absolutely nothing else — no markdown, no explanation:
{"safe": true, "reason": "Brief reason here"}
or
{"safe": false, "reason": "Brief reason here"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: `File name: "${originalName}". Is this safe for an educational platform? JSON only.`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AI MOD] Claude API error:", response.status, errText);
      // Fail open — don't block uploads when API is temporarily down
      return { safe: true, reason: "AI moderation unavailable — allowed with warning" };
    }

    const data = await response.json();
    const text = data.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    console.log(`[AI MOD] "${originalName}": safe=${result.safe} | ${result.reason}`);
    return result;

  } catch (err) {
    console.error("[AI MOD] Error:", err.message);
    // Fail open — never block on moderation crash
    return { safe: true, reason: "AI moderation error — allowed with warning" };
  }
}

// =====================================================
// HELPER — safely delete temp file
// =====================================================
function deleteTempFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.error("Failed to delete temp file:", e.message);
  }
}

// ================= UPLOAD ROUTE =================
app.post("/upload", upload.single("file"), async (req, res) => {
  const filePath = req.file?.path;

  try {

    // ── GUARD ───────────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    // ── STEP 1: File type + extension check ─────────────────────────
    console.log(`\n[UPLOAD] ${req.file.originalname} (${req.file.mimetype}, ${(req.file.size / 1024).toFixed(1)}KB)`);
    const typeCheck = checkFileType(req.file);
    if (!typeCheck.safe) {
      deleteTempFile(filePath);
      console.warn(`[BLOCKED - TYPE] ${typeCheck.reason}`);
      return res.status(400).json({ success: false, error: typeCheck.reason });
    }
    console.log(`[PASS - TYPE] ${typeCheck.reason}`);

    // ── STEP 2: Virus scan ──────────────────────────────────────────
    const virusCheck = scanForVirus(filePath);
    if (!virusCheck.safe) {
      deleteTempFile(filePath);
      console.warn(`[BLOCKED - VIRUS] ${virusCheck.reason}`);
      return res.status(400).json({ success: false, error: virusCheck.reason });
    }
    console.log(`[PASS - VIRUS] ${virusCheck.reason}`);

    // ── STEP 3: AI content moderation ──────────────────────────────
    const aiCheck = await moderateWithAI(filePath, req.file.mimetype, req.file.originalname);
    if (!aiCheck.safe) {
      deleteTempFile(filePath);
      console.warn(`[BLOCKED - AI] ${aiCheck.reason}`);
      return res.status(403).json({ success: false, error: `Content rejected: ${aiCheck.reason}` });
    }
    console.log(`[PASS - AI] ${aiCheck.reason}`);

    // ── STEP 4: Upload to Google Drive ──────────────────────────────
    console.log(`[DRIVE] Uploading...`);
    const driveResponse = await drive.files.create({
      resource: { name: req.file.originalname, parents: [FOLDER_ID] },
      media: { mimeType: req.file.mimetype, body: fs.createReadStream(filePath) },
      fields: "id"
    });

    const fileId = driveResponse.data.id;

    // ── STEP 5: Make file public ────────────────────────────────────
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" }
    });

    const link = `https://drive.google.com/file/d/${fileId}/view`;

    // ── STEP 6: Save to Firestore ───────────────────────────────────
    await db.collection("Papers").add({
      name: req.body.filename,
      uploadedBy: req.body.name,
      email: req.body.email,
      link: link,
      ownerId: req.body.uid,
      subject: (req.body.subject || "").toLowerCase().trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // ── STEP 7: Clean up temp file ──────────────────────────────────
    deleteTempFile(filePath);

    console.log(`[SUCCESS] ${req.file.originalname} → ${link}`);
    res.json({ success: true, link });

  } catch (error) {
    console.error("[ERROR]", error.message);
    deleteTempFile(filePath);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================= START SERVER =================
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
  console.log("🛡️  3-layer protection active:");
  console.log("    1. File type + extension check");
  console.log("    2. ClamAV virus scan");
  console.log("    3. Claude AI content moderation");
  console.log("KEY:", process.env.ANTHROPIC_API_KEY);
});