// (1) 기존 import 유지 + 추가 fetch 사용
import { useState, useEffect } from "react";
import ChatInput from "./components/ChatInput";
import Login from "./components/Login";
import { sendPromptApi } from "./utils/api";
import "./App.css";

const API_URL = import.meta.env.VITE_API_BASE_URL;

function App() {
  // (2) 상태 정의: 로그인 대기 상태 추가
  const [loginState, setLoginState] = useState("logged_out"); // "logged_out" | "waiting_login" | "logged_in"
  const [messages, setMessages] = useState([]);
  const [userInfo, setUserInfo] = useState(null);

  // (3) 로그인 정보 복원
  useEffect(() => {
    const savedUserInfo = localStorage.getItem("userInfo");
    if (savedUserInfo) {
      const parsed = JSON.parse(savedUserInfo);
      setUserInfo(parsed);
      // 복원 시에는 로그인 완료 상태로 두지 않음 (실행웹이 로그인 유지중일 수도 있음)
      setLoginState("waiting_login");
    }
  }, []);

  // (4) 로그인 성공 시 → 바로 logged_in  → waiting_login 상태 유지
  const handleLoginSuccess = (userData) => {
    console.log("로그인 요청 접수:", userData);
    localStorage.setItem("userInfo", JSON.stringify(userData));
    setUserInfo(userData);
    setLoginState("waiting_login");

    setMessages([
      {
        id: Date.now(),
        sender: "system",
        content: "로그인 요청이 접수되었습니다. 실행 웹이 로그인 중입니다...",
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // (5) 로그인 실패 처리
  const handleLoginError = () => {
    setLoginState("logged_out");
  };

  // (6) 로그아웃 시 백엔드 초기화
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, { method: "POST" });
    } catch (e) {
      console.error("로그아웃 API 실패:", e);
    }
    localStorage.removeItem("userInfo");
    setLoginState("logged_out");
    setUserInfo(null);
    setMessages([]);
  };

  // (7) 프롬프트 전송
  const handleSend = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      content: text,
      sender: "user",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // 로딩 메시지 ID
    const loadingMessageId = Date.now() + 1;

    // 로딩 단계 메시지들
    const loadingSteps = [
      `'${text}' 작업을 시작합니다...`,
      "요청을 처리 중입니다...",
      "AI 모델이 분석 중입니다...",
      "액션을 생성하고 있습니다...",
      "실행 웹에서 작업 준비 중...",
      "nDRIMS 페이지에서 작업 실행 중...",
    ];

    let currentStep = 0;

    // 첫 번째 로딩 메시지 즉시 표시
    setMessages((prev) => [...prev, {
      id: loadingMessageId,
      content: loadingSteps[0],
      sender: "bot",
      timestamp: new Date().toISOString(),
    }]);

    // 3초마다 다음 로딩 메시지로 업데이트
    const loadingInterval = setInterval(() => {
      currentStep++;
      if (currentStep < loadingSteps.length) {
        setMessages((prev) =>
          prev.map(m => m.id === loadingMessageId
            ? { ...m, content: loadingSteps[currentStep] }
            : m
          )
        );
      } else {
        // 마지막 단계에 도달하면 계속 유지
        currentStep = loadingSteps.length - 1;
      }
    }, 3000);

    // loadingInterval을 정리할 수 있도록 저장
    window._currentLoadingInterval = loadingInterval;
    window._currentLoadingMessageId = loadingMessageId;

    try {
      const response = await sendPromptApi(text);
      console.log("프롬프트 응답:", response);

      // 로딩 메시지 제거
      clearInterval(window._currentLoadingInterval);
      window._currentLoadingInterval = null;
      setMessages((prev) => prev.filter(m => m.id !== loadingMessageId));
      window._currentLoadingMessageId = null;

      // 검증 결과 즉시 표시 (폴링 불필요)
      const resultMessage = {
        id: Date.now() + 2,
        content: response.success
          ? `✓ 실행 완료: ${response.message}`
          : `✗ 실패: ${response.message}`,
        sender: "bot",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, resultMessage]);

    } catch (err) {
      console.error("메시지 전송 오류:", err);

      // 로딩 메시지 제거
      clearInterval(window._currentLoadingInterval);
      window._currentLoadingInterval = null;
      setMessages((prev) => prev.filter(m => m.id !== loadingMessageId));
      window._currentLoadingMessageId = null;

      const errorMessage = {
        id: Date.now() + 2,
        content: `오류: ${err.message}`,
        sender: "system",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

// (8) /status 폴링하여 로그인/실행 상태 반영
useEffect(() => {
  if (loginState === "logged_out") return;

  // [추가됨] 창 닫힘 감지 → 자동 로그아웃
  const handleBeforeUnload = async (e) => {
    try {
      await fetch(`${API_URL}/logout`, { method: "POST" });
      console.log("[자동 로그아웃] 프롬프트웹 종료 감지 → 백엔드에 로그아웃 요청");
    } catch (err) {
      console.error("[자동 로그아웃] 요청 실패:", err);
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}/status`);
      const data = await res.json();

      // 실행웹 종료 또는 세션 만료 → 자동 로그아웃 처리
      if (data.status === "waiting" || data.data?.loginSuccess === false) {
        console.warn("[상태] 실행웹 종료 또는 세션 만료 → 자동 로그아웃 처리");
        localStorage.removeItem("userInfo");
        setLoginState("logged_out");
        setUserInfo(null);
        setMessages([]);
        return;
      }

      // 로그인 완료 감지
      if (loginState === "waiting_login" && data.data?.loginSuccess) {
        console.log("로그인 완료 감지됨!");
        setLoginState("logged_in");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "bot",
            content: " 로그인 성공! 이제 프롬프트를 입력할 수 있습니다.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      // 실행 완료는 /prompt 응답으로 처리 (폴링 불필요)
    } catch (e) {
      console.error("상태 폴링 실패:", e);
    }
  }, 4000);

  // [추가됨] 이벤트 리스너 / 인터벌 정리
  return () => {
    clearInterval(interval);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, [loginState]);


  // (9) 로그인 UI
  if (loginState === "logged_out") {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onLoginError={handleLoginError}
      />
    );
  }

  // (9.5) 로그인 대기 상태 UI
  if (loginState === "waiting_login") {
    return (
      <div className="app">
        <div className="app-header">
          <h1>nDRIMS 로그인 중...</h1>
        </div>
        <div className="chat-box">
          <div className="message system">
             실행 웹이 로그인 중입니다. 잠시만 기다려주세요...
          </div>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${
                msg.sender === "user"
                  ? "user"
                  : msg.sender === "system"
                  ? "system"
                  : "bot"
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // (10) 로그인 완료 후 채팅 UI
  return (
    <div className="app">
      <div className="app-header">
        <h1>nDRIMS LAM</h1>
        <div className="user-info">
          <span>{userInfo?.name}님 환영합니다!</span>
          <button onClick={handleLogout} className="logout-button">
            로그아웃
          </button>
        </div>
      </div>

      <div className="chat-box">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${
              msg.sender === "user"
                ? "user"
                : msg.sender === "system"
                ? "system"
                : "bot"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <ChatInput onSend={handleSend} />
    </div>
  );
}



// (11) export 동일
export default App;

