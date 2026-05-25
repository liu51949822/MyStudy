/**
 * ============================================
 * Prompt 模板引擎 — lib/prompt-engine.ts
 * ============================================
 *
 * 这个文件提供简单的模板渲染功能。
 *
 * 模板示例：
 *   你是一个{{role}}。请{{action}}。
 *   内容：{{content}}
 *
 * 渲染结果：
 *   你是一个知识库助手。请回答用户问题。
 *   内容：RAG 是检索增强生成...
 *
 * 虽然这只是一个简单的变量替换，
 * 但它是更复杂的模板引擎（如 Handlebars、Mustache）的基础。
 */

/**
 * 简单的模板渲染函数
 *
 * 支持：
 * - {{变量名}}：变量替换
 * - {{#if 条件}}内容{{/if}}：条件渲染（如果条件为真）
 * - {{#each 列表}}内容{{/each}}：列表渲染（暂不支持）
 *
 * @param template - 模板字符串
 * @param data - 变量数据
 * @returns 渲染后的字符串
 */
export function renderTemplate(
  template: string,
  data: Record<string, any>
): string {
  let result = template;

  // 替换普通变量 {{key}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : match;
  });

  // 处理条件渲染 {{#if key}}内容{{/if}}
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, key, content) => {
      return data[key] ? content : "";
    }
  );

  return result;
}

/**
 * 渲染 Prompt 模板
 *
 * @param templateId - 模板标识
 * @param data - 模板变量
 * @param customTemplates - 可选的额外模板
 */
export function renderPrompt(
  templateId: string,
  data: Record<string, any>,
  customTemplates?: Record<string, string>
): string {
  // 内建模板
  const builtinTemplates: Record<string, string> = {
    qa: `你是一个知识库助手。请基于资料回答用户的问题。
如果资料里没有相关信息，请说"资料库中未找到相关信息"。
回答要简洁、准确。

=== 参考资料 ===
{{context}}

=== 用户问题 ===
{{question}}`,

    summarize: `请对以下内容进行简洁总结：
1. 抓住核心要点
2. 使用简洁语言
3. 控制在200字以内

{{#if context}}{{context}}{{/if}}
{{#if question}}{{question}}{{/if}}`,
  };

  const template =
    customTemplates?.[templateId] || builtinTemplates[templateId];
  if (!template) {
    return `（未知模板: ${templateId}）`;
  }

  return renderTemplate(template, data);
}
