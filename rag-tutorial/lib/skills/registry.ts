/**
 * ============================================
 * Skill 技能系统 — lib/skills/registry.ts
 * ============================================
 *
 * 什么是 Skill？
 * Skill = 技能。每个 Skill 是一个独立的 AI 能力模块。
 *
 * 就像手机有"拍照"、"录像"、"人像"等模式，
 * RAG 系统有"问答"、"总结"、"翻译"等技能。
 *
 * Skill 的优势：
 * 1. 模块化：每个技能独立，互不影响
 * 2. 可扩展：添加新技能只需写一个新文件
 * 3. 可切换：用户可以根据需要选择技能
 */

import OpenAI from "openai";

/**
 * Skill 输入输出接口
 */
export interface SkillInput {
  question: string;        // 用户的问题
  context?: string;        // 从知识库检索到的上下文
  history?: { role: string; content: string }[];
  [key: string]: any;      // 额外参数
}

export interface SkillOutput {
  answer: string;
  metadata?: Record<string, any>;
}

/**
 * Skill 接口
 *
 * 每个 Skill 必须实现：
 * - id: 唯一标识
 * - name: 显示名称
 * - description: 说明（给用户看）
 * - execute: 执行函数
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  execute(input: SkillInput): Promise<SkillOutput>;
}

/**
 * 技能注册中心
 *
 * 用 Map 存储所有已注册的技能。
 * key = skill id, value = Skill 对象
 */
const skillRegistry = new Map<string, Skill>();

/**
 * 注册技能
 */
export function registerSkill(skill: Skill): void {
  skillRegistry.set(skill.id, skill);
  console.log(`🧩 已注册技能: ${skill.name} (${skill.id})`);
}

/**
 * 获取所有技能
 */
export function getAllSkills(): Skill[] {
  return Array.from(skillRegistry.values());
}

/**
 * 根据 ID 获取技能
 */
export function getSkill(id: string): Skill | undefined {
  return skillRegistry.get(id);
}

/**
 * 获取 DeepSeek 客户端
 */
function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY });
}

// ========== 注册内建技能 ==========

// QA 技能 —— 默认的问答模式
registerSkill({
  id: "qa",
  name: "📖 知识问答",
  description: "基于知识库回答用户问题（默认模式）",
  execute: async (input: SkillInput) => {
    const { question, context, history } = input;
    const messages: any[] = [
      {
        role: "system",
        content: `你是一个知识库助手。请基于以下资料来回答用户的问题。
如果资料里没有相关信息，请说"资料库中未找到相关信息"。
回答要简洁、准确。`,
      },
    ];
    if (history?.length) {
      messages.push(...history.filter((m) => m.role === "user" || m.role === "assistant"));
    }
    messages.push({
      role: "user",
      content: `=== 参考资料 ===\n${context || "（无参考资料）"}\n\n=== 用户问题 ===\n${question}`,
    });
    const res = await getOpenAI().chat.completions.create({
      model: "deepseek-chat", messages, temperature: 0.3,
    });
    return { answer: res.choices[0]?.message?.content || "抱歉，无法回答。" };
  },
});

// 总结技能
registerSkill({
  id: "summarize",
  name: "📝 内容总结",
  description: "对检索到的内容进行提炼和总结",
  execute: async (input: SkillInput) => {
    const { question, context } = input;
    const res = await getOpenAI().chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `你是一个总结助手。请对以下内容进行简洁的总结。
要求：
1. 抓住核心要点（3-5 个点）
2. 使用简洁的语言
3. 控制在 200 字以内
4. 如果内容是英文，用中文总结`,
        },
        {
          role: "user",
          content: `=== 需要总结的内容 ===\n${context || question}\n\n请总结以上内容。`,
        },
      ],
      temperature: 0.3,
    });
    return { answer: res.choices[0]?.message?.content || "总结失败。" };
  },
});

// 翻译技能
registerSkill({
  id: "translate",
  name: "🌐 翻译",
  description: "将检索到的内容翻译成中文或英文",
  execute: async (input: SkillInput) => {
    const { question, context } = input;
    const res = await getOpenAI().chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `你是一个翻译助手。请根据用户的要求翻译内容。
如果用户没指定目标语言，自动检测源语言并翻译成中文。`,
        },
        {
          role: "user",
          content: `=== 需要翻译的内容 ===\n${context || question}\n\n=== 翻译要求 ===\n${question}`,
        },
      ],
      temperature: 0.3,
    });
    return { answer: res.choices[0]?.message?.content || "翻译失败。" };
  },
});

// 分析技能
registerSkill({
  id: "analyze",
  name: "🔍 深度分析",
  description: "对检索到的内容进行结构化分析和解读",
  execute: async (input: SkillInput) => {
    const { question, context } = input;
    const res = await getOpenAI().chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `你是一个分析助手。请对以下内容进行结构化分析。
分析格式：
1. 核心观点
2. 关键论据
3. 优点/优势
4. 局限/不足
5. 综合结论`,
        },
        {
          role: "user",
          content: `=== 分析内容 ===\n${context || question}\n\n=== 分析要求 ===\n${question}`,
        },
      ],
      temperature: 0.4,
    });
    return { answer: res.choices[0]?.message?.content || "分析失败。" };
  },
});
