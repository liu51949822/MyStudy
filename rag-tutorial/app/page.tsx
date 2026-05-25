"use client";

import { useState, useRef, FormEvent, useEffect } from "react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  sources?: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ingestText, setIngestText] = useState("");
  const [ingestMessage, setIngestMessage] = useState("");
  const [ingestLoading, setIngestLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showIngest, setShowIngest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 处理文件上传
  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadMessage("请先选择一个文件");
      return;
    }
    setUploadLoading(true);
    setUploadMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      setUploadMessage(data.message || data.error || "操作完成");
      if (res.ok && fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setUploadMessage("请求失败");
    } finally {
      setUploadLoading(false);
    }
  }

  // 处理文本入库
  async function handleIngest(e: FormEvent) {
    e.preventDefault();
    if (!ingestText.trim()) return;
    setIngestLoading(true);
    setIngestMessage("");
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: ingestText }),
      });
      const data = await res.json();
      setIngestMessage(data.message || data.error || "操作完成");
      if (res.ok) setIngestText("");
    } catch {
      setIngestMessage("请求失败");
    } finally {
      setIngestLoading(false);
    }
  }

  // 处理发送消息
  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setLoading(true);

    // 先把用户消息添加到聊天
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sessionId }),
      });
      const data = await res.json();

      if (res.ok) {
        setSessionId(data.sessionId);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
            sources: data.sources,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || "查询失败" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "请求失败，请检查网络连接" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ===== 顶部标题栏 ===== */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, margin: 0 }}>📚 RAG 对话</h1>
          <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0 0" }}>
            基于知识库的多轮对话 RAG 系统
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowUpload(!showUpload)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              backgroundColor: showUpload ? "#e0e0e0" : "#f5f5f5",
              border: "1px solid #d0d0d0",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            📂 上传文件
          </button>
          <button
            onClick={() => setShowIngest(!showIngest)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              backgroundColor: showIngest ? "#e0e0e0" : "#f5f5f5",
              border: "1px solid #d0d0d0",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            📝 手动入库
          </button>
        </div>
      </div>

      {/* ===== 上传区域（可折叠） ===== */}
      {showUpload && (
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid #e0e0e0",
            backgroundColor: "#fafafa",
            flexShrink: 0,
          }}
        >
          <form onSubmit={handleUpload} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              style={{
                flex: 1,
                padding: 8,
                fontSize: 13,
                border: "1px solid #d0d0d0",
                borderRadius: 4,
                cursor: "pointer",
              }}
            />
            <button
              type="submit"
              disabled={uploadLoading}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                backgroundColor: uploadLoading ? "#ccc" : "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: uploadLoading ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {uploadLoading ? "上传中..." : "上传"}
            </button>
          </form>
          {uploadMessage && (
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#0070f3" }}>
              {uploadMessage}
            </p>
          )}
        </div>
      )}

      {/* ===== 手动入库区域（可折叠） ===== */}
      {showIngest && (
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid #e0e0e0",
            backgroundColor: "#fafafa",
            flexShrink: 0,
          }}
        >
          <form onSubmit={handleIngest}>
            <textarea
              value={ingestText}
              onChange={(e) => setIngestText(e.target.value)}
              placeholder="输入要存入知识库的文本..."
              rows={3}
              style={{
                width: "100%",
                padding: 8,
                fontSize: 13,
                border: "1px solid #d0d0d0",
                borderRadius: 4,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="submit"
                disabled={ingestLoading || !ingestText.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  backgroundColor: ingestLoading ? "#ccc" : "#0070f3",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: ingestLoading ? "not-allowed" : "pointer",
                }}
              >
                {ingestLoading ? "处理中..." : "存入知识库"}
              </button>
            </div>
            {ingestMessage && (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#0070f3" }}>
                {ingestMessage}
              </p>
            )}
          </form>
        </div>
      )}

      {/* ===== 消息列表区域（滚动） ===== */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#999",
              marginTop: 60,
              fontSize: 14,
              lineHeight: 2,
            }}
          >
            <p style={{ fontSize: 40, marginBottom: 8 }}>💬</p>
            <p>知识库已准备好，开始提问吧！</p>
            <p style={{ fontSize: 13, color: "#bbb" }}>
              你也可以先上传文件或手动输入文本到知识库
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "10px 14px",
                borderRadius: 12,
                backgroundColor:
                  msg.role === "user" ? "#0070f3" : "#f0f0f0",
                color: msg.role === "user" ? "#fff" : "#333",
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <>
                  <div>{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <details style={{ marginTop: 8 }}>
                      <summary
                        style={{
                          cursor: "pointer",
                          fontSize: 12,
                          color: "#666",
                        }}
                      >
                        查看参考来源（{msg.sources.length} 条）
                      </summary>
                      <div style={{ marginTop: 6 }}>
                        {msg.sources.map((src, j) => (
                          <p
                            key={j}
                            style={{
                              fontSize: 11,
                              color: "#888",
                              padding: 6,
                              backgroundColor: "#fff",
                              borderRadius: 4,
                              marginBottom: 4,
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            [{j + 1}] {src}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
            <span
              style={{
                fontSize: 11,
                color: "#aaa",
                marginTop: 4,
              }}
            >
              {msg.role === "user" ? "你" : "AI"}
            </span>
          </div>
        ))}

        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                backgroundColor: "#f0f0f0",
                color: "#999",
                fontSize: 14,
              }}
            >
              思考中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ===== 底部输入栏 ===== */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid #e0e0e0",
          flexShrink: 0,
        }}
      >
        <form onSubmit={handleSend} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题..."
            style={{
              flex: 1,
              padding: "10px 14px",
              fontSize: 14,
              border: "1px solid #d0d0d0",
              borderRadius: 8,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              backgroundColor: loading || !input.trim() ? "#ccc" : "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "..." : "发送"}
          </button>
        </form>
      </div>
    </div>
  );
}
