import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RAG 入门教程 - AI 知识库",
  description: "一个最简单的 RAG (检索增强生成) 入门应用",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
