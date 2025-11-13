# API 명세 비교 - 백엔드 연동 가이드

## 📋 현재 상황

백엔드 팀에서 제공한 API 명세와 프론트엔드가 필요로 하는 API 명세가 다릅니다.

---

## 🔴 백엔드 팀 제공 API 명세 (단순 버전)

### POST /login
```json
// 요청
{
  "student_id": "string",
  "password": "string"
}

// 응답
200 "성공"
```

### POST /prompt
```json
// 요청
{
  "text": "string"
}

// 응답
200 "성공"
```

---

## 🟢 프론트엔드가 필요로 하는 API 명세 (확장 버전)

### POST /login

**요청:**
```json
{
  "student_id": "string",
  "password": "string"
}
```

**응답 (200):**
```json
{
  "success": true,
  "token": "string",
  "status": "pending",
  "message": "로그인 요청이 접수되었습니다."
}
```

### GET /login-status?token={token}

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

### POST /prompt

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

## 🤔 왜 확장된 응답이 필요한가?

### 1. 실행 웹(Playwright) 연동

```
프론트엔드 → 백엔드 → 실행 웹 (Playwright)
                ↓
            nDRIMS 로그인 (5-10초 소요)
                ↓
프론트엔드 ← 백엔드 ← 실행 웹
```

- 로그인은 **실행 웹(Playwright)**이 실제 nDRIMS 사이트에서 수행
- **5-10초 이상 걸리므로** 즉시 응답 불가능
- **폴링(polling)** 방식으로 상태 확인 필요

### 2. 사용자 경험 (UX)

- 로그인 진행 중: "로그인 중입니다..." 로딩 화면 표시
- 로그인 완료: 사용자 정보와 함께 채팅 화면으로 전환
- 로그인 실패: 명확한 에러 메시지 표시

### 3. 토큰 기반 인증

- 로그인 성공 시 `token` 발급
- 이후 모든 API 요청에 `Authorization: Bearer {token}` 헤더 포함
- 세션 관리 및 보안 유지

---

## 💡 해결 방안

### 옵션 1: 백엔드 팀이 확장된 API 구현 (권장)

**장점:**
- ✅ 프론트엔드 코드 수정 불필요
- ✅ 실행 웹(Playwright) 정상 작동
- ✅ 폴링 방식으로 로그인 진행 상태 추적 가능

**단점:**
- ❌ 백엔드 개발 공수 증가

**구현 방법:**
- `BACKEND_INTEGRATION.md` 문서 참고
- Mock 서버 코드(`server.cjs`) 참고하여 구현

---

### 옵션 2: 프론트엔드를 단순 API에 맞춤 (비권장)

**장점:**
- ✅ 백엔드 개발 간단

**단점:**
- ❌ **실행 웹(Playwright) 연동 불가능** ⚠️
- ❌ 로그인 진행 상태 표시 불가능
- ❌ 토큰 기반 인증 미구현
- ❌ 에러 처리 불가능

**결과:**
- 실행 웹이 실제 로그인을 수행할 수 없음
- nDRIMS 자동 로그인 기능 작동 안 함 🚫

---

## 🎯 결론 및 권장사항

### ✅ 권장: 옵션 1 (백엔드 팀이 확장된 API 구현)

실행 웹(Playwright)과의 연동을 위해서는 **확장된 API 명세가 필수**입니다.

**백엔드 팀이 구현해야 할 것:**

1. **POST /login** - 로그인 요청 접수 및 pending 상태 반환
2. **GET /login-status** - 폴링용 상태 확인 엔드포인트
3. **세션 관리** - 토큰 기반 세션 저장 및 상태 관리
4. **명령 큐 시스템** - 실행 웹과의 통신 (폴링 or WebSocket)
5. **실행 웹 API** - GET /command, POST /state

**참고 문서:**
- `BACKEND_INTEGRATION.md` - 상세 구현 가이드
- `server.cjs` - Mock 서버 참고 코드

---

## 📞 다음 단계

1. ✅ 백엔드 팀과 API 명세 협의
2. ✅ 백엔드 팀이 확장된 API 구현
3. ✅ `.env.production` 파일에 백엔드 URL 입력
4. ✅ 프론트엔드 빌드 및 배포
5. ✅ 통합 테스트

**문의사항:**
- 프론트엔드 팀 또는 백엔드 팀에 문의하세요!
