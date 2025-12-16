// server.js - Workiwi Backend API (In-Memory Version)
// 실행: node server.js

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- In-Memory Database (DB 대체용) ---
const projects = [
  { 
    id: 1, 
    name: 'Workiwi MVP', 
    description: '팀 AI 협업 툴 개발',
    settings: {
      techStack: ['React', 'Tailwind CSS', 'Supabase', 'Node.js'],
      convention: '함수형 컴포넌트 사용, 화살표 함수 지향, 불변성 유지',
      tone: '친절하고 논리적인 어조',
      customInstructions: '초보 개발자도 이해하기 쉽게 설명할 것'
    }
  }
];

const documents = []; // 생성된 문서를 저장할 배열

// --- Helper: System Prompt ---
const buildSystemInstruction = (settings, agentType) => {
  const basePrompt = `
    당신은 '${agentType}' 역할을 맡은 AI 에이전트입니다.
    다음 프로젝트 규칙(Ruleset)을 엄격히 준수하여 답변하세요.
    
    [기술 스택]
    ${settings.techStack.join(', ')}
    
    [코딩 컨벤션]
    ${settings.convention}
    
    [톤앤매너]
    ${settings.tone}
    
    [추가 지시사항]
    ${settings.customInstructions}
  `;

  let roleSpecificPrompt = '';
  switch (agentType) {
    case 'PM': roleSpecificPrompt = '회의록 정리, 일정 산출, 기획 의도 파악에 집중하세요.'; break;
    case 'DEV': roleSpecificPrompt = '제공된 기술 스택 외의 라이브러리 사용을 지양하세요. 실제 실행 가능한 코드를 작성하세요.'; break;
    case 'DESIGNER': roleSpecificPrompt = 'UI/UX 사용성을 최우선으로 고려하고, Tailwind CSS 클래스 기준으로 스타일을 제안하세요.'; break;
    default: roleSpecificPrompt = '성실히 답변하세요.';
  }

  return `${basePrompt}\n\n[역할별 지침]\n${roleSpecificPrompt}`;
};

// --- API Routes ---

/** [POST] /api/chat - AI와 대화하기 */
app.post('/api/chat', async (req, res) => {
  try {
    const { projectId, message, agentType, history } = req.body;
    
    // 1. 프로젝트 설정 조회
    const project = projects.find(p => p.id === Number(projectId)) || projects[0];
    const settings = project.settings;

    // 2. Gemini 모델 설정
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: buildSystemInstruction(settings, agentType) }]
      }
    });

    // 3. 채팅 이력 구성 (Gemini 포맷에 맞춤)
    // 클라이언트에서 { sender: 'user'|'ai', text: '...' } 형태로 온다고 가정
    const chatHistory = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: { maxOutputTokens: 1000 },
    });

    // 4. 메시지 전송
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ 
      reply: text,
      agentType,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ reply: "죄송합니다. AI 서버 연결 중 오류가 발생했습니다. (API Key를 확인해주세요)" });
  }
});

/** [POST] /api/docs - 문서 저장 */
app.post('/api/docs', (req, res) => {
  const { title, content, type } = req.body;
  
  const newDoc = {
    id: documents.length + 1,
    title,
    content,
    type,
    date: new Date().toLocaleDateString(),
    created_at: new Date()
  };

  documents.unshift(newDoc); // 최신 순 저장
  console.log('Document Saved:', newDoc.title);
  
  res.json({ success: true, doc: newDoc });
});

/** [GET] /api/docs - 문서 목록 조회 */
app.get('/api/docs', (req, res) => {
  res.json(documents);
});

app.listen(PORT, () => {
  console.log(`🚀 Workiwi Server running on http://localhost:${PORT}`);
});