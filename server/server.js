// server.js - Workiwi Backend API
// 필요한 패키지: express, cors, dotenv, @google/generative-ai, @supabase/supabase-js
// 실행 방법: node server.js

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Configuration ---
// 실제 환경변수 설정이 필요합니다.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_KEY';
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Mock Data (DB 연동 전 테스트용) ---
const MOCK_PROJECT_SETTINGS = {
  techStack: ['React', 'Tailwind CSS', 'Node.js', 'Supabase'],
  convention: '함수형 컴포넌트 사용, 에러 핸들링 엄수, 주석 필수',
  tone: '친절하고 논리적인 어조',
  customInstructions: '초보 개발자도 이해하기 쉽게 설명할 것'
};

// --- Helper: Construct System Prompt ---
// 프로젝트 설정(RuleSet)을 AI가 이해할 수 있는 시스템 프롬프트로 변환
const buildSystemInstruction = (settings, agentType) => {
  const basePrompt = `
    당신은 '${agentType}' 역할을 맡은 AI 에이전트입니다.
    다음 프로젝트 규칙(Ruleset)을 엄격히 준수하여 답변하세요.
    
    [기술 스택]
    ${settings.techStack.join(', ')}
    
    [코딩 컨벤션 및 규칙]
    ${settings.convention}
    
    [톤앤매너]
    ${settings.tone}
    
    [추가 지시사항]
    ${settings.customInstructions}
  `;

  let roleSpecificPrompt = '';
  switch (agentType) {
    case 'PM':
      roleSpecificPrompt = '회의록 정리, 일정 산출, 기획 의도 파악에 집중하세요. 문서는 구조화된 포맷으로 제안하세요.';
      break;
    case 'DEV':
      roleSpecificPrompt = '제공된 기술 스택 외의 라이브러리 사용을 지양하세요. 코드는 프로덕션 레벨로 작성하세요.';
      break;
    case 'DESIGNER':
      roleSpecificPrompt = 'UI/UX 사용성을 최우선으로 고려하고, Tailwind CSS 클래스 기준으로 스타일을 제안하세요.';
      break;
    default:
      roleSpecificPrompt = '프로젝트의 성공을 위해 성실히 답변하세요.';
  }

  return `${basePrompt}\n\n[역할별 지침]\n${roleSpecificPrompt}`;
};

// --- API Routes ---

/**
 * [POST] /api/chat
 * 사용자 메시지를 받아 프로젝트 컨텍스트를 주입한 후 Gemini에게 전달
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { projectId, message, agentType, history } = req.body;

    // 1. 프로젝트 설정 조회 (Supabase 연동 시 실제 DB 조회로 대체)
    // const { data: settings } = await supabase.from('project_settings').select('*').eq('project_id', projectId).single();
    const settings = MOCK_PROJECT_SETTINGS; 

    // 2. 시스템 프롬프트 구성
    const systemInstruction = buildSystemInstruction(settings, agentType);

    // 3. Gemini 모델 초기화 및 채팅 시작
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstruction }]
      }
    });

    const chat = model.startChat({
      history: history || [], // 이전 대화 컨텍스트 유지
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    // 4. 메시지 전송 및 응답 수신
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // 5. 대화 로그 저장 (비동기 처리)
    // await supabase.from('chat_logs').insert({ ... });

    res.json({ 
      reply: text,
      agentType,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' });
  }
});

/**
 * [POST] /api/docs
 * 채팅 내용을 기반으로 문서를 생성하여 JSON 포맷으로 저장
 */
app.post('/api/docs', async (req, res) => {
  try {
    const { projectId, title, content, type, authorId } = req.body;

    // 기획서 3단계: 문서를 JSON 구조로 저장
    // content는 클라이언트에서 이미 JSON 구조로 변환되어 들어오거나,
    // 여기서 텍스트를 파싱하여 구조화할 수 있습니다.
    
    const docData = {
      project_id: projectId,
      title,
      content: content, // JSONB in Postgres
      type, // 'MEETING', 'SPEC', 'MEMO'
      author_id: authorId,
      created_at: new Date()
    };

    // DB 저장 (Mock)
    console.log('Document Saved to DB:', docData);
    
    // 실제 Supabase 저장 코드
    // const { data, error } = await supabase.from('documents').insert([docData]);
    
    res.status(201).json({ success: true, docId: Date.now(), ...docData });

  } catch (error) {
    console.error('Doc Save Error:', error);
    res.status(500).json({ error: '문서 저장 실패' });
  }
});

/**
 * [GET] /api/projects/:id/settings
 * 프로젝트 룰셋 조회
 */
app.get('/api/projects/:id/settings', async (req, res) => {
  // 실제 로직: DB에서 조회
  res.json(MOCK_PROJECT_SETTINGS);
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`🚀 Workiwi API Server running on port ${PORT}`);
  console.log(`📝 Context Injection Logic Ready`);
});