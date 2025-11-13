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

    try {
      const response = await sendPromptApi(text);
      console.log("프롬프트 응답:", response);

      const botMessage = {
        id: Date.now() + 1,
        content:
          response.message ||
          "프롬프트가 전달되었습니다. 잠시만 기다려주세요...",
        sender: "bot",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          content: " 실행 중입니다... 잠시만 기다려주세요.",
          sender: "system",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("메시지 전송 오류:", err);
      const errorMessage = {
        id: Date.now() + 1,
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

      // 실행 완료 상태 감지
      if (loginState === "logged_in" && data.status === "completed") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            content: ` 실행 완료: ${
              data.data.action_description || "작업이 성공적으로 끝났습니다."
            }`,
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
      } else if (data.status === "error") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            content: ` 오류: ${data.message}`,
            sender: "system",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
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

