//  API 호출 유틸리티
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

/**
 *  로그인 API
 * POST /login
 * 백엔드: FastAPI (Api.py)
 */
export const loginApi = async (studentId, password) => {
  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: studentId,
        password: password,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.detail || data.message || "로그인에 실패했습니다.");
    }

    if (!data.ok) {
      throw new Error(data.message || "로그인에 실패했습니다.");
    }

    // 백엔드 응답: { ok: true, student_id, message }
    return data;
  } catch (err) {
    console.error("[loginApi 오류]", err);
    throw err;
  }
};

/**
 *  프롬프트 전송 API
 * POST /prompt
 * 백엔드: FastAPI (Api.py)
 */
export const sendPromptApi = async (text) => {
  try {
    const res = await fetch(`${API_BASE_URL}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.detail || data.message || "메시지 전송에 실패했습니다.");
    }

    // 백엔드 응답: { success: bool, message: string }
    return data;
  } catch (err) {
    console.error("[sendPromptApi 오류]", err);
    throw err;
  }
};

/**
 *  로그아웃 API (선택적)
 * POST /logout
 */
export const logoutApi = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
    });
    return await res.json();
  } catch (err) {
    console.error("[logoutApi 오류]", err);
  }
};

/**
 *  상태 확인 API (선택적)
 * GET /status
 */
export const getStatusApi = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/status`);
    return await res.json();
  } catch (err) {
    console.error("[getStatusApi 오류]", err);
    return null;
  }
};
