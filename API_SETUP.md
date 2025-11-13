# API 연동 가이드

## 변경 사항 요약

### 1. API 명세서에 맞게 구조 변경
- **로그인**: `POST /login` (student_id, password)
- **프롬프트 전송**: `POST /prompt` (text)

### 2. 새로 생성된 파일
- `.env.development` - 개발 환경 변수
- `.env.production` - 프로덕션 환경 변수
- `src/utils/api.js` - API 호출 유틸리티
- `server.cjs` - Mock API 서버 (커스텀 라우트)

### 3. 수정된 파일
- `src/components/Login.jsx` - API 명세에 맞게 수정
  - `username` → `student_id` 변경
  - `POST /login` 호출
- `src/App.jsx` - 채팅 메시지 API 연동
  - `POST /prompt` 호출
  - 메시지 타입별 표시 (user, bot, system)
- `src/App.css` - 메시지 타입별 스타일 추가
- `db.json` - Mock 데이터 업데이트 (student_id 사용)

---

## 실행 방법

### 개발 모드 (Mock API 사용)

**터미널 1** - Mock API 서버 실행:
```bash
npm run server
```
→ `http://localhost:3001`에서 Mock API 실행

**터미널 2** - React 앱 실행:
```bash
npm run dev
```
→ `http://localhost:5173`에서 프론트엔드 실행

### 테스트 계정
```
학번: 2019123456
비밀번호: test1234

학번: 2020654321
비밀번호: password
```

---

## 백엔드 API 연동 방법

백엔드가 완성되면 다음 단계를 따르세요:

### 1. `.env.production` 파일 수정
```bash
# 실제 백엔드 URL로 변경
VITE_API_BASE_URL=https://your-backend-api.com
VITE_USE_MOCK=false
```

### 2. Mock 서버 제거 (선택)
```bash
# server.cjs와 db.json 삭제 가능
rm server.cjs db.json
```

### 3. 실제 백엔드 API 응답 형식 확인

**POST /login 응답 예시:**
```json
{
  "success": true,
  "token": "actual-jwt-token",
  "name": "홍길동",
  "message": "로그인 성공"
}
```

**POST /prompt 응답 예시:**
```json
{
  "success": true,
  "message": "실제 백엔드 응답 메시지",
  "data": {
    "prompt": "사용자 입력",
    "response": "nDRIMS 응답",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. API 응답 형식이 다를 경우

`src/utils/api.js`에서 응답 처리 로직 수정:

```javascript
// loginApi 함수에서
const data = await response.json();
// 백엔드 응답 형식에 맞게 수정
return data;

// sendPromptApi 함수에서
const data = await response.json();
// 백엔드 응답 형식에 맞게 수정
return data;
```

---

## API 명세서 (참고)

### POST /login
**Request:**
```json
{
  "student_id": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "string",
  "name": "string",
  "message": "string"
}
```

### POST /prompt
**Request:**
```json
{
  "text": "string"
}
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
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

## 주요 기능

### 1. 로그인 상태 유지
- localStorage에 토큰 저장
- 새로고침해도 로그인 상태 유지
- 로그아웃 기능

### 2. 실시간 메시지 전송
- 사용자 메시지 (우측, 핑크)
- 봇 응답 (좌측, 연핑크)
- 에러 메시지 (중앙, 빨강)

### 3. 환경 변수 관리
- 개발: Mock API 사용
- 프로덕션: 실제 API 사용
- URL만 변경하면 즉시 전환

---

## 문제 해결

### Mock API 서버가 실행되지 않을 때
```bash
# json-server가 설치되어 있는지 확인
npm list json-server

# 없으면 재설치
npm install json-server --save-dev
```

### CORS 오류가 발생할 때
백엔드 서버에서 CORS 설정 필요:
```javascript
// Express 예시
app.use(cors({
  origin: 'http://localhost:5173'
}));
```

### 환경변수가 적용되지 않을 때
```bash
# React 앱 재시작
npm run dev
```

---

## 다음 단계

1. **백엔드 개발**: 실제 nDRIMS 로그인 로직 구현
2. **API 연동**: `.env.production` 수정 후 테스트
3. **배포**: 프론트엔드와 백엔드 연동 확인
