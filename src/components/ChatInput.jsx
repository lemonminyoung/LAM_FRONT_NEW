import { useState } from "react";
import { saveJson } from "../utils/saveJson";

function ChatInput({ onSend }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    onSend(input);
    saveJson(input); // JSON 저장 기능 호출
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input">
      <input
        type="text"
        placeholder="메시지를 입력하세요..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button type="submit">전송</button>
    </form>
  );
}

export default ChatInput;
