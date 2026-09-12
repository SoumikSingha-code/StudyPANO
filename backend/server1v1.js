// ================= IMPORTS =================
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const admin = require("firebase-admin");
const Redis = require("ioredis");
const { createAdapter } = require("@socket.io/redis-adapter");

// ================= INIT =================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ================= REDIS =================
const redis = new Redis();
const pub = new Redis();
const sub = new Redis();
io.adapter(createAdapter(pub, sub));

// ================= FIREBASE =================
admin.initializeApp({
  credential: admin.credential.cert(require("./firebase-key.json"))
});

// ================= STORAGE =================
const MATCH_QUEUE = "match_queue";
const ROOMS = "rooms";
const USER_ROOM = "user_room";
const aiPlayers = {};

// ================= QUESTIONS =================
// ✅ FIX: Removed duplicate `const questions` that was shadowing QUESTIONS below.
//    If you want to load from Mathquestions.json, replace the QUESTIONS object
//    with: const QUESTIONS = JSON.parse(fs.readFileSync("./Mathquestions.json", "utf-8"));
const QUESTIONS = {
  math: [
    { q: "2+2?", options: ["3", "4", "5", "6"], ans: 1 },
    { q: "5+5?", options: ["8", "10", "12", "15"], ans: 1 }
  ],
  physics: [
    { q: "What is the SI unit of force?", options: ["Newton", "Joule", "Watt", "Pascal"], ans: 0 },
    { q: "Speed of light?", options: ["3x10^8 m/s", "3x10^6 m/s", "3x10^10 m/s", "3x10^4 m/s"], ans: 0 }
  ],
  chemistry: [
    { q: "What is H2O?", options: ["Water", "Hydrogen", "Oxygen", "Carbon dioxide"], ans: 0 },
    { q: "Atomic number of Carbon?", options: ["6", "8", "12", "14"], ans: 0 }
  ],
  biology: [
    { q: "What is the powerhouse of the cell?", options: ["Mitochondria", "Nucleus", "Ribosome", "Golgi"], ans: 0 },
    { q: "How many chambers in human heart?", options: ["4", "2", "3", "1"], ans: 0 }
  ],
  computer: [
    { q: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Power Unit", "Control Processing Unit", "Central Power Unit"], ans: 0 },
    { q: "What is RAM?", options: ["Random Access Memory", "Read Access Memory", "Random Access Module", "Read Access Module"], ans: 0 }
  ],
  "history/civics": [
    { q: "Who was the first President of India?", options: ["Rajendra Prasad", "Sardar Patel", "Jawaharlal Nehru", "Sachin Tendulkar"], ans: 0 },
    { q: "When was India independence?", options: ["1947", "1948", "1950", "1946"], ans: 0 }
  ],
  geography: [
    { q: "What is the capital of India?", options: ["New Delhi", "Mumbai", "Kolkata", "Chennai"], ans: 0 },
    { q: "Which is the longest river?", options: ["Nile", "Amazon", "Yangtze", "Ganges"], ans: 3 }
  ],
  hindi: [
    { q: "What is 'Pani' in English?", options: ["Water", "Fire", "Earth", "Air"], ans: 0 },
    { q: "How many vowels in Hindi?", options: ["13", "11", "15", "10"], ans: 0 }
  ],
  literature: [
    { q: "Who wrote 'Ramayana'?", options: ["Valmiki", "Vyasa", "Kalidas", "Tulsidas"], ans: 0 },
    { q: "What is 'Mahabharata'?", options: ["Epic", "Novel", "Poem", "Story"], ans: 0 }
  ],
  language: [
    { q: "How many letters in English alphabet?", options: ["26", "25", "27", "24"], ans: 0 },
    { q: "What is a noun?", options: ["Name of person/place/thing", "Action word", "Describing word", "Connecting word"], ans: 0 }
  ]
};

// ================= AUTH =================
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = await admin.auth().verifyIdToken(token);
    socket.user = decoded;

    await redis.set(`uid:${decoded.uid}`, socket.id);

    const existingRoom = await redis.get(`user_room:${decoded.uid}`);
    if (existingRoom) {
      socket.join(existingRoom);
      const raw = await redis.hget(ROOMS, existingRoom);
      if (raw) {
        socket.emit("reconnected", { roomId: existingRoom, room: JSON.parse(raw) });
      }
    }

    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// ================= HELPERS =================
function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function generateInviteLink(roomId) {
  return `http://localhost:3000/join.html?room=${roomId}`;
}

function getAIDifficulty(elo) {
  if (elo < 1000) return "easy";
  if (elo < 1400) return "medium";
  return "hard";
}

async function getUserElo(uid) {
  const doc = await admin.firestore().collection("users").doc(uid).get();
  return doc.data()?.elo || 1000;
}

// ================= STREAK =================
// Streak rules:
//   - Playing today for the first time → streak++
//   - Already played today           → streak unchanged
//   - Gap > 2 days since last play   → streak resets to 1
async function updateAndGetStreak(uid) {
  const ref = admin.firestore().collection("users").doc(uid);
  const doc = await ref.get();
  const data = doc.data() || {};

  // ✅ FIX: Use UTC date string for today to match how lastPlayed is stored
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD" UTC
  const lastStr = data.lastPlayed || null;
  let streak = data.streak || 0;

  if (!lastStr) {
    streak = 1;
  } else if (lastStr === todayStr) {
    // Already played today — streak unchanged
  } else {
    // ✅ FIX: Compare UTC midnight timestamps to get whole-day difference
    const todayMs = Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
    );
    const [ly, lm, ld] = lastStr.split("-").map(Number);
    const lastMs = Date.UTC(ly, lm - 1, ld);
    const diffDays = Math.round((todayMs - lastMs) / (1000 * 60 * 60 * 24));

    if (diffDays <= 2) {
      streak += 1;
    } else {
      streak = 1;
    }
  }

  await ref.set({ streak, lastPlayed: todayStr }, { merge: true });
  console.log(`Streak updated for ${uid}: ${streak} (lastPlayed: ${lastStr} → ${todayStr})`);
  return streak;
}

// ================= MATCHMAKING =================
async function findMatch(uid, elo) {
  let list = await redis.zrangebyscore(MATCH_QUEUE, elo - 200, elo + 200);
  for (let opp of list) {
    if (opp !== uid) {
      await redis.zrem(MATCH_QUEUE, opp);
      return opp;
    }
  }
  await redis.zadd(MATCH_QUEUE, elo, uid);
  return null;
}

// ================= GAME =================

// ✅ FIX: Track timeout handles per room so we can clear stale timeouts
const questionTimeouts = {};

async function sendQuestion(roomId) {
  const raw = await redis.hget(ROOMS, roomId);
  if (!raw) return;

  let room = JSON.parse(raw);
  const subject = (room.subject || "").toLowerCase();
  const questions = QUESTIONS[subject];
  if (!questions || room.currentQ >= questions.length) return;

  const q = questions[room.currentQ];
  if (!q) return;

  room.qStartTime = Date.now();
  room.answered = {};

  await redis.hset(ROOMS, roomId, JSON.stringify(room));

  io.to(roomId).emit("newQuestion", {
    question: q.q,
    q: q.q,
    qs: q.q,
    options: q.options,
    index: room.currentQ,
    serverTime: room.qStartTime
  });

  // ===== AI LOGIC =====
  if (aiPlayers[roomId]) {
    const ai = aiPlayers[roomId];
    const qIndex = room.currentQ; // snapshot to guard against stale closures

    io.to(roomId).emit("opponentThinking", true);

    setTimeout(async () => {
      const raw2 = await redis.hget(ROOMS, roomId);
      if (!raw2) return;

      let room2 = JSON.parse(raw2);

      // ✅ FIX: Guard — only act if still on the same question
      if (room2.currentQ !== qIndex) return;

      room2.answered = room2.answered || {};
      if (room2.answered["AI"]) return;

      if (Math.random() < ai.acc) {
        ai.score += 10;
        // ✅ FIX: Write AI score into room.scores so gameOver sends correct value
        room2.scores["AI"] = ai.score;
      }

      io.to(roomId).emit("opponentUpdate", { score: ai.score });
      io.to(roomId).emit("opponentThinking", false);

      room2.answered["AI"] = true;
      await redis.hset(ROOMS, roomId, JSON.stringify(room2));

      checkNext(roomId);
    }, Math.random() * (ai.max - ai.min) + ai.min);
  }

  // ===== TIMEOUT =====
  // ✅ FIX: Clear previous timeout to avoid double-advancing
  if (questionTimeouts[roomId]) clearTimeout(questionTimeouts[roomId]);

  questionTimeouts[roomId] = setTimeout(async () => {
    const raw3 = await redis.hget(ROOMS, roomId);
    if (!raw3) return;

    let room3 = JSON.parse(raw3);

    // ✅ FIX: Guard — only fire if still on same question
    if (room3.qStartTime !== room.qStartTime) return;

    const totalPlayers = room3.players.length + (aiPlayers[roomId] ? 1 : 0);

    if (Object.keys(room3.answered).length < totalPlayers) {
      room3.players.forEach(p => {
        if (!room3.answered[p]) room3.answered[p] = true;
      });
      if (aiPlayers[roomId]) room3.answered["AI"] = true;

      await redis.hset(ROOMS, roomId, JSON.stringify(room3));
      checkNext(roomId);
    }
  }, 20000);
}

async function checkNext(roomId) {
  let room = JSON.parse(await redis.hget(ROOMS, roomId));
  if (!room) return;

  const totalPlayers = room.players.length + (aiPlayers[roomId] ? 1 : 0);

  if (Object.keys(room.answered).length >= totalPlayers) {
    room.currentQ++;
    const subject = (room.subject || "").toLowerCase();
    const questions = QUESTIONS[subject];

    if (room.currentQ >= questions.length) {
      console.log(`Game over for room ${roomId}, scores:`, room.scores);

      // ✅ FIX: Emit gameOver to each player individually with THEIR own streak
      for (const playerId of room.players) {
        let streak = 0;
        try {
          streak = await updateAndGetStreak(playerId);
        } catch (e) {
          console.error(`Streak update failed for ${playerId}:`, e);
        }

        const playerSid = await redis.get(`uid:${playerId}`);
        if (playerSid) {
          // Frontend destructures { scores, streak } — send singular streak
          io.to(playerSid).emit("gameOver", {
            scores: room.scores,
            streak           // ✅ this player's personal streak
          });
        }
      }

      await redis.hdel(ROOMS, roomId);
      for (let p of room.players) await redis.del(`user_room:${p}`);

      if (questionTimeouts[roomId]) {
        clearTimeout(questionTimeouts[roomId]);
        delete questionTimeouts[roomId];
      }

      delete aiPlayers[roomId];
      return;
    }

    await redis.hset(ROOMS, roomId, JSON.stringify(room));
    setTimeout(() => sendQuestion(roomId), 1000);
  }
}

function startGame(roomId) {
  io.to(roomId).emit("startGame");
  sendQuestion(roomId);
}

// ================= SOCKET =================
io.on("connection", (socket) => {
  const uid = socket.user.uid;

  // ===== RANDOM MATCH =====
  socket.on("findMatch", async ({ subject: rawSubject }) => {
    const subject = (rawSubject || "").toLowerCase();
    const elo = await getUserElo(uid);
    const opponent = await findMatch(uid, elo);

    if (opponent) {
      const roomId = generateRoomId();
      const oppSocket = await redis.get(`uid:${opponent}`);

      socket.join(roomId);
      io.to(oppSocket).socketsJoin(roomId);

      await redis.hset(ROOMS, roomId, JSON.stringify({
        subject,
        players: [uid, opponent],
        scores: { [uid]: 0, [opponent]: 0 },
        currentQ: 0,
        answered: {}
      }));

      await redis.set(`user_room:${uid}`, roomId);
      await redis.set(`user_room:${opponent}`, roomId);

      io.to(roomId).emit("matchFound", { vs: "player", roomId });
      startGame(roomId);
    } else {
      socket.emit("waiting");

      setTimeout(async () => {
        const still = await redis.zscore(MATCH_QUEUE, uid);

        if (still) {
          await redis.zrem(MATCH_QUEUE, uid);

          const roomId = generateRoomId();
          socket.join(roomId);

          await redis.hset(ROOMS, roomId, JSON.stringify({
            subject,
            players: [uid],
            scores: { [uid]: 0, AI: 0 },  // ✅ FIX: AI score starts at 0 in room
            currentQ: 0,
            answered: {}
          }));

          await redis.set(`user_room:${uid}`, roomId);

          const elo = await getUserElo(uid);
          const difficulty = getAIDifficulty(elo);

          aiPlayers[roomId] = {
            score: 0,
            acc: difficulty === "easy" ? 0.5 : difficulty === "medium" ? 0.7 : 0.9,
            min: 1000,
            max: 3000,
          };

          socket.emit("matchFound", { vs: "ai", roomId });
          startGame(roomId);
        }
      }, 5000);
    }
  });

  // ===== CREATE ROOM =====
  socket.on("createRoom", async ({ subject: rawSubject }) => {
    const subject = (rawSubject || "").toLowerCase();
    const roomId = generateRoomId();

    await redis.hset(ROOMS, roomId, JSON.stringify({
      subject,
      players: [uid],
      scores: { [uid]: 0 },
      currentQ: 0,
      answered: {}
    }));

    await redis.set(`user_room:${uid}`, roomId);
    socket.join(roomId);

    socket.emit("roomCreated", {
      roomId,
      inviteLink: generateInviteLink(roomId)
    });
  });

  // ===== JOIN ROOM =====
  socket.on("joinRoom", async ({ roomId }) => {
    let room = JSON.parse(await redis.hget(ROOMS, roomId));
    if (!room) return socket.emit("error", "Room not found");
    if (room.players.length >= 2) return socket.emit("error", "Room full");

    room.players.push(uid);
    room.scores[uid] = 0;
    room.answered = room.answered || {};

    await redis.hset(ROOMS, roomId, JSON.stringify(room));
    await redis.set(`user_room:${uid}`, roomId);

    socket.join(roomId);

    io.to(roomId).emit("matchFound", { vs: "friend", roomId });
    startGame(roomId);
  });

  // ===== ANSWER =====
  socket.on("answer", async ({ roomId, answer, clientTime }) => {
    // ✅ FIX: Coerce answer to number — Socket.IO may deliver it as string in some envs
    const answerIndex = Number(answer);
    console.log(`Answer received: uid=${uid}, roomId=${roomId}, answerIndex=${answerIndex}`);

    let room = JSON.parse(await redis.hget(ROOMS, roomId));
    if (!room) return console.log(`Room not found: ${roomId}`);

    room.answered = room.answered || {};

    if (room.answered[uid]) return console.log(`Already answered: uid=${uid}`);

    // ✅ FIX: Normalize subject to lowercase to guard against any casing issues
    const subject = (room.subject || "").toLowerCase();
    const questions = QUESTIONS[subject];
    if (!questions) return console.log(`No questions for subject: "${subject}"`);

    const q = questions[room.currentQ];
    if (!q) return console.log(`No question at index: ${room.currentQ}`);

    room.scores[uid] = room.scores[uid] || 0;

    // ✅ FIX: Compare number to number explicitly
    if (answerIndex === q.ans) {
      room.scores[uid] += 10;
      console.log(`Correct! uid=${uid} new score=${room.scores[uid]}`);
    } else {
      console.log(`Wrong. answerIndex=${answerIndex} correct=${q.ans}`);
    }

    room.answered[uid] = true;

    await redis.hset(ROOMS, roomId, JSON.stringify(room));

    socket.emit("answerResult", {
      correctIndex: q.ans,
      myScore: room.scores[uid]
    });

    // Notify the other real player
    for (const playerId of room.players) {
      if (playerId === uid) continue;
      const oppSid = await redis.get(`uid:${playerId}`);
      if (oppSid) {
        io.to(oppSid).emit("opponentUpdate", { score: room.scores[uid] });
      }
    }

    checkNext(roomId);
  });

  // ===== GET GAME STATE (reconnect) =====
  socket.on("getGameState", async ({ roomId }) => {
    const raw = await redis.hget(ROOMS, roomId);
    if (!raw) return socket.emit("error", "Room not found");

    const room = JSON.parse(raw);
    const questions = QUESTIONS[room.subject];
    if (!questions) return socket.emit("error", "Invalid subject");

    const q = questions[room.currentQ];
    if (!q) return socket.emit("error", "Question not found");

    socket.emit("gameState", {
      question: q.q,
      q: q.q,
      qs: q.q,
      options: q.options,
      answered: room.answered,
      scores: room.scores,
      currentQ: room.currentQ,
      totalQuestions: questions.length,
      serverTime: room.qStartTime || Date.now()
    });
  });

  socket.on("disconnect", async () => {
    await redis.zrem(MATCH_QUEUE, uid);
  });
});

// ================= START =================
server.listen(3000, () => console.log("🚀 Server running on 3000"));