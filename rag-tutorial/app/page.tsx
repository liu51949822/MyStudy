"use client";

import { useState, useRef, FormEvent } from "react";

export default function Home() {
  const [ingestText, setIngestText] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploadMessage(data.message || data.error || "操作完成");
      if (res.ok && fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setUploadMessage("请求失败，请检查网络连接");
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleIngest(e: FormEvent) {
    e.preventDefault();
    if (!ingestText.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: ingestText }),
      });
      const data = await res.json();
      setMessage(data.message || data.error || "操作完成");
      if (res.ok) setIngestText("");
    } catch {
      setMessage("请求失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  }

  /**
   * 处理知识问答
   */
  async function handleQuery(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");
    setSources([]);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      if (res.ok) {
        setAnswer(data.answer);
        setSources(data.sources || []);
      } else {
        setAnswer(data.error || "查询失败");
      }
    } catch {
      setAnswer("请求失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>📚 RAG 知识库</h1>
      <p
        style={{
          color: "#666",
          marginBottom: 40,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        这是一个最简单的 RAG（检索增强生成）入门应用。
        <br />
        先往知识库里存入一些文本，然后就可以基于这些文本提问了。
      </p>

      {/* ===== 文件上传区域 ===== */}
      <section
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>📂 文件上传</h2>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
          支持上传 .txt 和 .md 文件。文件内容会被自动分块后存入知识库。
        </p>

        <form onSubmit={handleUpload}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            style={{
              width: "100%",
              padding: 12,
              fontSize: 14,
              border: "1px solid #d0d0d0",
              borderRadius: 6,
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          />
          <button
            type="submit"
            disabled={uploadLoading}
            style={{
              marginTop: 12,
              padding: "10px 24px",
              fontSize: 14,
              backgroundColor: uploadLoading ? "#ccc" : "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: uploadLoading ? "not-allowed" : "pointer",
            }}
          >
            {uploadLoading ? "上传中..." : "上传并入库"}
          </button>
        </form>

        {uploadMessage && (
          <p
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 6,
              backgroundColor: "#f0f7ff",
              color: "#0070f3",
              fontSize: 14,
            }}
          >
            {uploadMessage}
          </p>
        )}
      </section>

      {/* ===== 知识入库区域 ===== */}
      <section
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>📥 知识入库</h2>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
          把你想让 AI 了解的文本存进来。比如产品说明、技术文档、学习笔记等。
        </p>

        <form onSubmit={handleIngest}>
          <textarea
            value={ingestText}
            onChange={(e) => setIngestText(e.target.value)}
            placeholder="输入要存入知识库的文本..."
            rows={4}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 14,
              border: "1px solid #d0d0d0",
              borderRadius: 6,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={loading || !ingestText.trim()}
            style={{
              marginTop: 12,
              padding: "10px 24px",
              fontSize: 14,
              backgroundColor: loading ? "#ccc" : "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "处理中..." : "存入知识库"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 6,
              backgroundColor: "#f0f7ff",
              color: "#0070f3",
              fontSize: 14,
            }}
          >
            {message}
          </p>
        )}
      </section>

      {/* ===== 知识问答区域 ===== */}
      <section
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>🔍 知识问答</h2>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
          基于知识库中的内容来提问。AI 会先搜索相关资料，再给出回答。
        </p>

        <form onSubmit={handleQuery}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="输入你的问题..."
            style={{
              width: "100%",
              padding: 12,
              fontSize: 14,
              border: "1px solid #d0d0d0",
              borderRadius: 6,
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            style={{
              marginTop: 12,
              padding: "10px 24px",
              fontSize: 14,
              backgroundColor: loading ? "#ccc" : "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "思考中..." : "提问"}
          </button>
        </form>

        {answer && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 6,
              backgroundColor: "#f9f9f9",
            }}
          >
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>🤖 AI 回答</h3>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                color: "#333",
              }}
            >
              {answer}
            </p>

            {sources.length > 0 && (
              <details style={{ marginTop: 16 }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#666",
                  }}
                >
                  查看参考来源（{sources.length} 条）
                </summary>
                <div style={{ marginTop: 8 }}>
                  {sources.map((src, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: 12,
                        color: "#888",
                        padding: 8,
                        backgroundColor: "#fff",
                        borderRadius: 4,
                        marginBottom: 4,
                        border: "1px solid #eee",
                      }}
                    >
                      [{i + 1}] {src}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      {/* ===== 使用步骤提示 ===== */}
      <section
        style={{
          padding: 20,
          backgroundColor: "#fafafa",
          borderRadius: 8,
          fontSize: 13,
          color: "#666",
          lineHeight: 1.8,
        }}
      >
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>💡 快速开始</h3>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>确保已配置好 .env.local 文件（OpenAI Key 和数据库连接）</li>
          <li>在"知识入库"区域输入一些文本，点击存入</li>
          <li>在"知识问答"区域输入相关问题，点击提问</li>
          <li>AI 会基于你存入的知识来回答</li>
        </ol>
      </section>
    </main>
  );
}
