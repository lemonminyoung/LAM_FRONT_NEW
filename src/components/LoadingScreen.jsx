import { useEffect, useState } from "react";

function LoadingScreen({ message = "로그인 중..." }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h2 className="loading-message">
          {message}
          {dots}
        </h2>
        <p className="loading-description">
          동국대학교 nDRIMS에 로그인 중입니다.
          <br />
          잠시만 기다려주세요.
        </p>
      </div>
    </div>
  );
}

export default LoadingScreen;
