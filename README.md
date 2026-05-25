# RAG 入门教程 — 文档处理 RAG

## 相对于 rag_1 的新增功能
- 📂 **文件上传**: 支持上传 .txt / .md 文件自动入库
- ✂️ **文本分块**: 三种分块策略（fixed / paragraph / recursive）

## 新增文件
| 文件 | 说明 |
|------|------|
| `lib/chunker.ts` | 文本分块器（3 种策略） |
| `app/api/upload/route.ts` | 文件上传 API |

## 分块策略
- **fixed**: 固定 500 字，重叠 50 字
- **paragraph**: 按空行分块
- **recursive**: 递归按分隔符切分（推荐）

## 教学文档
`docs/07-文本分块详解.md`、`docs/08-文件上传处理.md`
