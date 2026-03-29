export const SECTION_SEPARATOR = '---SECTION---'

export function buildExplainPrompt(params: { full_text: string; highlight: string }): string {
  return `你是一位专业的阅读助手。用户正在阅读一篇文章，并划线了一段文字。

${params.full_text ? `【完整文章】\n${params.full_text}\n\n` : ''}【划线文字】
"${params.highlight}"

请按以下格式输出三段内容，每段之间用 ${SECTION_SEPARATOR} 分隔（只输出内容，不要输出标题或说明）：

第一段：局部含义（2-3句）
这段话本身说了什么？聚焦于划线文字自身的含义，不依赖文章背景。

${SECTION_SEPARATOR}

第二段：上下文解读（2-3句）
这段话在整篇文章中扮演什么角色？它与文章核心论点、结构或作者意图有何关联？

${SECTION_SEPARATOR}

第三段：划线意图（1句话）
推断用户为什么要划线这段话。用「用户可能想...」或「这段话帮助用户...」开头，简洁直接。`
}

// Full recluster: assign topics to ALL cards
export function buildClusterPrompt(cards: { id: string; title: string; ai_explanation: string; context_interpretation: string }[]): string {
  const cardList = cards.map(c =>
    `ID: ${c.id}\n标题: ${c.title}\n摘要: ${(c.ai_explanation || c.context_interpretation || '').slice(0, 120)}`
  ).join('\n\n---\n\n')

  return `你是一位知识整理助手。以下是用户收藏的知识卡片列表，请将它们按照话题/主题自动归类。

${cardList}

要求：
1. 归纳出 2-8 个话题分组，每个分组给一个简洁的中文话题名（2-6字）
2. 每张卡片只属于一个分组
3. 如果某张卡片很难归类，放入「其他」分组
4. 只返回 JSON，格式如下，不要有任何其他文字：

{
  "groups": [
    {
      "name": "话题名称",
      "card_ids": ["id1", "id2"]
    }
  ]
}`
}

// Incremental: assign topic to ONE new card given existing topics
export function buildAssignTopicPrompt(card: { title: string; ai_explanation: string; context_interpretation: string }, existingTopics: string[]): string {
  const topicList = existingTopics.length > 0
    ? existingTopics.map(t => `- ${t}`).join('\n')
    : '（暂无已有话题，请新建一个）'

  return `你是一位知识整理助手。以下是一张新知识卡片，请判断它属于哪个话题分组。

【新卡片】
标题: ${card.title}
摘要: ${(card.ai_explanation || card.context_interpretation || '').slice(0, 200)}

【已有话题列表】
${topicList}

要求：
1. 如果新卡片明显属于某个已有话题，返回该话题名（原文，不要修改）
2. 如果不属于任何已有话题，新建一个简洁的中文话题名（2-6字）
3. 只返回话题名称本身，不要有任何其他文字`
}

export function buildAnnotationSystemPrompt(params: { full_text: string; highlight: string }): string {
  return `你是一位帮助用户深度阅读和思考的助手。用户正在阅读一篇文章，对某段划线文字写下了批注想法。

【完整文章】
${params.full_text}

【划线文字】
"${params.highlight}"

你的任务：
1. 先判断用户批注的意图（疑问 / 理解确认 / 联想 / 批判 / 行动），用一句话说明
2. 根据意图给出有针对性的回应：
   - 疑问：不直接给答案，用一个更小的问题帮他自己想清楚
   - 理解确认：给一个边界案例或反例，让理解更精确
   - 联想：帮他把联想变成可验证的命题，问相似和区别在哪
   - 批判：帮他找到论证的支点，问反驳的核心假设是什么
   - 行动：把模糊意图变成具体的第一步

回应要简洁（3-5句），有态度，像一个真正在思考的读书伙伴，而不是百科全书。
用中文回答。不要说"好的""当然"之类的开场白，直接进入内容。`
}

export function buildChatSystemPrompt(params: { full_text: string; highlight: string }): string {
  return `You are a knowledgeable reading assistant. The user is reading an article and has saved a highlighted passage as a knowledge card. They want to discuss and understand it better.

FULL ARTICLE:
${params.full_text}

HIGHLIGHTED TEXT:
"${params.highlight}"

Answer the user's questions clearly. Use the article as your primary source of context.`
}
