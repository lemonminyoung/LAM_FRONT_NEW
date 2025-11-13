// Mock API 서버 - Express 기반
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); // CORS 허용
app.use(express.json()); // JSON 파싱

// db.json 읽기
const dbPath = path.join(__dirname, 'db.json');
const getDb = () => {
  const data = fs.readFileSync(dbPath, 'utf-8');
  return JSON.parse(data);
};

// 로그인 세션 관리 (Mock)
const loginSessions = new Map();
// key: token, value: { status: 'pending' | 'success' | 'failed', startTime, userData }

// 명령 큐 관리 (프롬프트 웹 → 실행 웹)
const commandQueue = [];
let currentCommand = null;

// 실행 웹 상태 저장
const executionWebState = {
  lastUpdate: null,
  data: {}
};

// POST /login - 로그인 API
app.post('/login', (req, res) => {
  const { student_id, password } = req.body;

  console.log('로그인 시도:', { student_id, password });

  // db.json에서 사용자 찾기
  const db = getDb();
  const user = db.users.find(
    (u) => u.student_id === student_id && u.password === password
  );

  if (user) {
    // 로그인 요청 접수 - pending 상태로 세션 생성
    const token = user.token;
    loginSessions.set(token, {
      status: 'pending',
      startTime: Date.now(),
      userData: {
        studentId: student_id,
        name: user.name,
        token: token,
      },
    });

    console.log(`로그인 요청 접수: ${user.name} (token: ${token})`);

    // 명령 큐에 로그인 명령 추가 (실행 웹으로 전달)
    const loginCommand = {
      id: Date.now(),
      type: 'login',
      student_id: student_id,
      password: password,
      token: token,
      timestamp: new Date().toISOString(),
    };
    commandQueue.push(loginCommand);
    console.log(`[명령 큐] 로그인 명령 추가: ${student_id}`);

    // 로그인 요청 접수 응답
    res.status(200).json({
      success: true,
      token: token,
      status: 'pending',
      message: '로그인 요청이 접수되었습니다. 잠시 후 다시 확인해주세요.',
    });
  } else {
    // 로그인 실패
    console.log('로그인 실패: 사용자를 찾을 수 없음');
    res.status(401).json({
      success: false,
      message: '학번 또는 비밀번호가 일치하지 않습니다.',
    });
  }
});

// GET /login-status - 로그인 상태 확인 (폴링용)
app.get('/login-status', (req, res) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(400).json({
      success: false,
      message: '토큰이 필요합니다.',
    });
  }

  const session = loginSessions.get(token);

  if (!session) {
    return res.status(404).json({
      success: false,
      status: 'not_found',
      message: '로그인 세션을 찾을 수 없습니다.',
    });
  }

  console.log(`로그인 상태 확인: token=${token}, status=${session.status}`);

  if (session.status === 'success') {
    // 로그인 완료
    res.status(200).json({
      success: true,
      status: 'success',
      message: '로그인이 완료되었습니다.',
      userData: session.userData,
    });
  } else if (session.status === 'failed') {
    // 로그인 실패
    res.status(200).json({
      success: false,
      status: 'failed',
      message: 'nDRIMS 로그인에 실패했습니다.',
    });
  } else {
    // 로그인 진행 중
    const elapsed = Date.now() - session.startTime;
    res.status(200).json({
      success: true,
      status: 'pending',
      message: '로그인 진행 중입니다.',
      elapsed: Math.floor(elapsed / 1000), // 경과 시간 (초)
    });
  }
});

// POST /prompt - 프롬프트 전송 API
app.post('/prompt', (req, res) => {
  const { text } = req.body;
  const token = req.headers.authorization;

  console.log('프롬프트 수신:', { text, token });

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 필요합니다.',
    });
  }

  // Mock 응답 - 실제로는 백엔드에서 nDRIMS와 통신
  res.status(200).json({
    success: true,
    message: `"${text}"에 대한 Mock 응답입니다.`,
    data: {
      prompt: text,
      response: `이것은 "${text}"에 대한 Mock 응답입니다. 실제 백엔드에서는 nDRIMS와 통신하여 응답을 생성합니다.`,
      timestamp: new Date().toISOString(),
    },
  });
});

// ===== 실행 웹 API =====

// GET /command - 실행 웹이 폴링할 명령 가져오기
app.get('/command', (req, res) => {
  if (commandQueue.length > 0 && !currentCommand) {
    // 큐에서 명령 하나 꺼내기
    currentCommand = commandQueue.shift();
    console.log(`[명령 큐] 명령 전달: type=${currentCommand.type}, id=${currentCommand.id}`);
  }

  if (currentCommand) {
    res.status(200).json(currentCommand);
  } else {
    // 명령이 없을 때
    res.status(200).json({
      type: 'none',
      message: '대기 중인 명령이 없습니다.',
    });
  }
});

// POST /state - 실행 웹에서 상태 전송
app.post('/state', (req, res) => {
  const { data } = req.body;

  console.log('[실행 웹] 상태 수신:', data);

  // 상태 저장
  executionWebState.lastUpdate = new Date().toISOString();
  executionWebState.data = data;

  // 로그인 결과 처리
  if (data.loginSuccess !== undefined && currentCommand) {
    const token = currentCommand.token;
    const commandType = currentCommand.type;

    // 현재 명령이 로그인 타입일 때만 처리
    if (commandType === 'login' && token && loginSessions.has(token)) {
      const session = loginSessions.get(token);

      // pending 상태일 때만 업데이트 (중복 처리 방지)
      if (session.status === 'pending') {
        if (data.loginSuccess) {
          session.status = 'success';
          console.log(`[로그인 완료] token=${token}`);
        } else {
          session.status = 'failed';
          console.log(`[로그인 실패] token=${token}`);
        }
      } else {
        console.log(`[경고] 이미 처리된 명령 무시: token=${token}, status=${session.status}`);
      }

      // 현재 명령 완료
      currentCommand = null;
    }
  }

  res.status(200).json({
    success: true,
    message: '상태가 저장되었습니다.',
  });
});

// GET /action - 구체적인 액션 가져오기
app.get('/action', (req, res) => {
  // Mock: 실제로는 LLM이나 규칙 기반으로 액션 생성
  res.status(200).json({
    action: 'click',
    selector: 'role=button[name="로그인"]',
    message: 'Mock 액션입니다.',
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`\n✅ Mock API Server is running on http://localhost:${PORT}`);
  console.log(`\n프롬프트 웹 API:`);
  console.log(`  POST http://localhost:${PORT}/login`);
  console.log(`  GET  http://localhost:${PORT}/login-status`);
  console.log(`  POST http://localhost:${PORT}/prompt`);
  console.log(`\n실행 웹 API:`);
  console.log(`  GET  http://localhost:${PORT}/command`);
  console.log(`  POST http://localhost:${PORT}/state`);
  console.log(`  GET  http://localhost:${PORT}/action\n`);
});
