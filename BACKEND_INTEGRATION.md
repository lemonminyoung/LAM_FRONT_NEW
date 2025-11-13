# 백엔드 연결 가이드

## 📋 현재 상태

현재 프론트엔드는 **로컬 Mock API** 서버와 연결되어 있습니다.

```
프론트엔드 (localhost:5173)
    ↓
Mock API 서버 (localhost:3001)
    ↓
실행 웹 (Python - localhost)
```

---

## 🔌 백엔드 연결 방법

### 1️⃣ 환경 변수 변경

`.env.production` 파일을 수정하세요:

```bash
# 백엔드 팀에서 제공받은 실제 URL로 변경
VITE_API_BASE_URL=https://your-backend-api.com
VITE_USE_MOCK=false
```

### 2️⃣ 프론트엔드 빌드

```bash
npm run build
```

### 3️⃣ 배포

빌드된 `dist` 폴더를 Vercel/Netlify 등에 배포하면 끝!

---

## 📡 백엔드 API 명세 확인

### ⚠️ 중요: 응답 형식

백엔드 팀에서 제공한 기본 API 명세는 단순한 "성공" 응답이지만,
**실행 웹(Playwright)과의 연동을 위해서는 아래의 확장된 응답 형식이 필요합니다.**

### ✅ POST /login (로그인)

**요청:**
```json
{
  "student_id": "string",
  "password": "string"
}
```

**응답 (200) - 필수 형식:**
```json
{
  "success": true,
  "token": "string",
  "status": "pending",
  "message": "로그인 요청이 접수되었습니다."
}
```

**⚠️ 만약 백엔드에서 단순 "성공" 응답만 제공한다면:**
- 프론트엔드를 수정하여 폴링 없이 즉시 로그인 완료 처리
- 실행 웹(Playwright) 연동이 제대로 작동하지 않을 수 있음

### ✅ GET /login-status (로그인 상태 확인 - 폴링)

**요청:**
```
GET /login-status?token=xxx
```

**응답 (200) - 진행 중:**
```json
{
  "success": true,
  "status": "pending",
  "message": "로그인 진행 중입니다.",
  "elapsed": 5
}
```

**응답 (200) - 완료:**
```json
{
  "success": true,
  "status": "success",
  "message": "로그인이 완료되었습니다.",
  "userData": {
    "studentId": "string",
    "name": "string",
    "token": "string"
  }
}
```

### ✅ POST /prompt (프롬프트 전송)

**요청:**
```json
{
  "text": "string"
}
```

**헤더:**
```
Authorization: Bearer {token}
```

**응답 (200):**
```json
{
  "success": true,
  "message": "string",
  "data": {
    "prompt": "string",
    "response": "string",
    "timestamp": "string"
  }
}
```

---

## 🎯 백엔드 팀이 구현해야 할 것

### 1. 로그인 플로우

```
1. POST /login 받음
   ↓
2. 명령 큐에 추가 (실행 웹으로 전달)
   ↓
3. status: "pending" 응답
   ↓
4. 실행 웹이 nDRIMS 로그인 수행
   ↓
5. 로그인 완료 시 세션 status를 "success"로 변경
   ↓
6. 프론트엔드가 GET /login-status로 폴링하여 확인
```

### 2. 세션 관리

- 토큰 기반 세션 관리
- 각 세션은 `{ status: 'pending' | 'success' | 'failed', userData: {...} }` 구조

### 3. 명령 큐 시스템

- 프론트엔드 → 백엔드: 로그인/프롬프트 요청
- 백엔드 → 실행 웹: 명령 전달 (폴링)
- 실행 웹 → 백엔드: 결과 전송

---

## 🔍 현재 프론트엔드 구현 상태

### ✅ 완료된 기능

- [x] 로그인 UI
- [x] 로딩 화면
- [x] 채팅 UI
- [x] 로그인 상태 폴링 (5초 간격)
- [x] localStorage 기반 세션 유지
- [x] 에러 처리
- [x] 로그아웃 기능
- [x] API 연동 로직

### 📝 API 호출 코드 위치

- `src/utils/api.js` - API 호출 함수들
- `src/components/Login.jsx` - 로그인 처리
- `src/App.jsx` - 폴링 및 상태 관리

---

## 🚀 테스트 방법

### 로컬 테스트 (Mock API)

```bash
# 터미널 1
npm run server

# 터미널 2
npm run dev
```

### 백엔드 연결 테스트

1. `.env.production` 파일에 백엔드 URL 입력
2. `npm run build`
3. `npm run preview` 로 빌드 결과 확인

---

## ⚠️ 주의사항

### CORS 설정

백엔드에서 CORS를 허용해야 합니다:

```javascript
// Express 예시
app.use(cors({
  origin: 'https://lam-frontend.vercel.app'
}));
```

### 폴링 간격

현재 5초 간격으로 폴링합니다. 필요시 `src/App.jsx:37` 에서 조정 가능합니다.

### 타임아웃

현재 타임아웃 설정이 없습니다. 필요시 추가해주세요.

---

## 📞 연락처

문제가 생기면 프론트엔드 팀에 문의하세요!
