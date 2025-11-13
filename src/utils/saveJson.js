export function saveJson(text) {
  const data = { message: text, timestamp: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "message.json";
  a.click();

  URL.revokeObjectURL(url);
}
