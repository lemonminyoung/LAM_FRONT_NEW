import { useState } from "react";
import { loginApi } from "../utils/api";

function Login({ onLoginSuccess, onLoginError }) {
  // (1) 기존 상태 동일
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  //(2) 로그인 요청 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId.trim() || !password.trim()) {
      setError("학번과 비밀번호를 입력해주세요.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // (3) 백엔드 API 호출 (POST /login)
      const data = await loginApi(studentId, password);
      console.log("로그인 API 응답:", data);

      // (4) 백엔드 응답 예시: { ok: true, student_id, message }
      if (data.ok) {
        console.log("로그인 요청 접수:", data.student_id);

        // 로그인 요청은 즉시 성공 처리 (실행웹이 실제 로그인 수행)
        onLoginSuccess({
          studentId: data.student_id,
          name: data.student_id, // 백엔드에서 name 미제공 → student_id 사용
          message: data.message,
        });
      } else {
        throw new Error(data.message || "로그인 요청이 실패했습니다.");
      }
    } catch (err) {
      console.error("로그인 오류:", err);

      // (5) 실패 시 부모에 알림
      if (onLoginError) {
        onLoginError();
      }

      // (6) 에러 메시지 표시
      setError(err.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // (7) 로그인 UI 렌더링
  return (
    <div className="login-container">
      <h1>nDRIMS 로그인</h1>

      <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-message">{error}</div>}

        <div className="login-input">
          <input
            type="text"
            placeholder="학번을 입력하세요..."
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="login-input">
          <input
            type="password"
            placeholder="비밀번호를 입력하세요..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <button type="submit" className="login-button" disabled={loading}>
          {loading ? "로그인 요청 중..." : "로그인"}
        </button>
      </form>

      <div className="test-accounts">
        <p>테스트 계정 (Mock 모드):</p>
        <ul>
          <li>2022112456 / a1637528!</li>
        </ul>
      </div>
    </div>
  );
}

export default Login;
