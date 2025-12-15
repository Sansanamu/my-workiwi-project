import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, FileText, Settings, LayoutDashboard, ChevronRight, Send, 
  Bot, User, Code, Cpu, Palette, Briefcase, Plus, Save, Search, Menu, X, FileJson
} from 'lucide-react';

// --- Types & Interfaces ---

interface Project {
  id: number;
  name: string;
  description: string;
}

interface ProjectRules {
  techStack: string[];
  convention: string;
  tone: string;
}

interface DocBlock {
  type: 'heading' | 'paragraph' | 'code' | 'list';
  content: string;
}

interface DocContent {
  version: string;
  blocks: DocBlock[];
}

interface Document {
  id: number;
  title: string;
  type: 'MEETING' | 'SPEC' | 'MEMO' | 'TECH';
  date: string;
  content: DocContent;
}

type AgentType = 'PM' | 'DEV' | 'DESIGNER';

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  agentType?: AgentType;
  timestamp: Date;
}

// --- Mock Data ---

const MOCK_PROJECTS: Project[] = [
  { id: 1, name: 'Workiwi MVP', description: '팀 AI 협업 툴 개발' },
  { id: 2, name: '사내 챗봇 고도화', description: 'RAG 기반 챗봇 개선' },
];

const INITIAL_RULES: ProjectRules = {
  techStack: ['React', 'Tailwind CSS', 'Supabase', 'Node.js'],
  convention: '함수형 컴포넌트 사용, 화살표 함수 지향, 불변성 유지',
  tone: '친절하고 논리적인 어조',
};

const INITIAL_DOCS: Document[] = [
  { 
    id: 1, 
    title: '기획서: TeamSync AI', 
    type: 'SPEC', 
    date: '2023-10-25',
    content: {
      version: "1.0",
      blocks: [
        { type: "heading", content: "프로젝트 목표" },
        { type: "paragraph", content: "팀 단위의 단일화된 AI 컨텍스트 제공 및 협업 효율 증대." },
        { type: "heading", content: "핵심 기능" },
        { type: "list", content: "- 역할별 에이전트\n- 프로젝트 룰셋 관리\n- 문서 JSON 저장" }
      ]
    }
  },
  { id: 2, title: 'DB 스키마 설계안', type: 'TECH', date: '2023-10-23', content: { version: "1.0", blocks: [] } },
];

// --- Colors ---
const COLORS = {
  main: '#d68f84',        // Coral / Terra-cotta
  mainHover: '#c0756a',   // Darker Coral
  base: '#fdf9f0',        // Cream / Off-white
  sidebar: '#3e3832',     // Dark Warm Brown/Grey
  sidebarBorder: '#4a433e',
  textMain: '#2c2520',    // Very Dark Brown
  textSub: '#8c8580',     // Warm Grey
  border: '#ebe5da',      // Warm Light Grey
  highlight: '#fdf2f0',   // Light Tint of Main
};

// --- Components ---

const AgentBadge: React.FC<{ type: AgentType }> = ({ type }) => {
  // 배지 컬러는 기능적 구분을 위해 유지하되, 톤을 살짝 다운시킴
  const styles: Record<AgentType, string> = {
    PM: 'bg-stone-100 text-stone-600 border-stone-200',
    DEV: 'bg-[#d68f84]/10 text-[#d68f84] border-[#d68f84]/20',
    DESIGNER: 'bg-orange-50 text-orange-600 border-orange-200',
  };
  const icons: Record<AgentType, React.ReactNode> = {
    PM: <Briefcase size={12} className="mr-1" />,
    DEV: <Code size={12} className="mr-1" />,
    DESIGNER: <Palette size={12} className="mr-1" />,
  };
  return (
    <span className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[type] || styles.PM}`}>
      {icons[type]}{type} Agent
    </span>
  );
};

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<string>('chat'); 
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [selectedProject, setSelectedProject] = useState<Project>(projects[0]);
  const [projectRules, setProjectRules] = useState<ProjectRules>(INITIAL_RULES);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', text: '안녕하세요! Workiwi 프로젝트의 Dev 에이전트입니다. 무엇을 도와드릴까요?', agentType: 'DEV', timestamp: new Date() }
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('DEV');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Docs State
  const [docs, setDocs] = useState<Document[]>(INITIAL_DOCS);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // --- Effects ---
  useEffect(() => {
    if (activeTab === 'chat') scrollToBottom();
  }, [messages, activeTab]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Logic ---

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');

    // Mock API Call
    try {
      // 1. 백엔드 서버로 요청 전송
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 백엔드가 기대하는 데이터 형식에 맞춰 Body 구성
        body: JSON.stringify({
          projectId: selectedProject.id,
          message: inputMessage,
          agentType: selectedAgent,
          history: messages // (선택) 이전 대화 기록이 필요하다면 함께 전송
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // 2. 백엔드로부터 응답 수신
      const data = await response.json();

      // 3. 채팅창에 AI 응답 표시
      const aiResponse: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.reply, // 백엔드에서 보내준 텍스트 (server.js의 res.json 참고)
        agentType: data.agentType || selectedAgent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);

    } catch (error) {
      console.error('Error connecting to backend:', error);
      // 에러 발생 시 사용자에게 알림 메시지 추가 가능
      const errorMessage: Message = {
        id: Date.now(),
        sender: 'ai',
        text: '서버 연결에 실패했습니다. 백엔드 서버가 켜져 있는지 확인해주세요.',
        agentType: 'DEV',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const saveToDocs = (msg: Message) => {
    const lines = msg.text.split('\n').filter(line => line.trim() !== '');
    const jsonBlocks: DocBlock[] = lines.map(line => {
      if (line.startsWith('#') || line.includes('모드]')) return { type: 'heading', content: line.replace(/#/g, '').trim() };
      if (line.startsWith('-') || line.match(/^\d\./)) return { type: 'list', content: line };
      return { type: 'paragraph', content: line };
    });

    const newDoc: Document = {
      id: docs.length + 1,
      title: `AI 대화 기록 (${msg.agentType}) - ${new Date().toLocaleDateString()}`,
      type: 'MEMO',
      date: new Date().toLocaleDateString(),
      content: {
        version: "1.0",
        blocks: jsonBlocks
      }
    };

    setDocs([newDoc, ...docs]);
    setActiveTab('docs');
    setSelectedDoc(newDoc);
  };

  const handleCreateProject = (name: string, description: string) => {
    const newProject: Project = {
      id: Date.now(),
      name,
      description
    };
    setProjects([...projects, newProject]);
    setSelectedProject(newProject);
    setShowNewProjectModal(false);
    alert(`새 프로젝트 '${name}'가 생성되었습니다.`);
  };

  // --- Sub-Components ---

  const NewProjectModal = () => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');

    if (!showNewProjectModal) return null;

    return (
      <div className="fixed inset-0 bg-[#3e3832]/50 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-6 w-96 shadow-2xl border border-[#ebe5da]">
          <h3 className="text-lg font-bold text-[#2c2520] mb-4">새 프로젝트 생성</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#8c8580] mb-1">프로젝트명</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[#ebe5da] rounded p-2 text-sm focus:ring-2 focus:ring-[#d68f84] outline-none bg-[#fdf9f0]"
                placeholder="예: 신규 사내 시스템 구축"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#8c8580] mb-1">설명</label>
              <textarea 
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full border border-[#ebe5da] rounded p-2 text-sm focus:ring-2 focus:ring-[#d68f84] outline-none h-20 resize-none bg-[#fdf9f0]"
                placeholder="프로젝트의 목표나 개요를 입력하세요."
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 text-sm text-[#8c8580] hover:bg-[#fdf9f0] rounded"
              >
                취소
              </button>
              <button 
                onClick={() => handleCreateProject(name, desc)}
                disabled={!name.trim()}
                className="px-4 py-2 text-sm bg-[#d68f84] text-white rounded hover:bg-[#c0756a] disabled:opacity-50"
              >
                생성하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DocViewer: React.FC<{ doc: Document | null, onBack: () => void }> = ({ doc, onBack }) => {
    if (!doc) return null;
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="border-b border-[#ebe5da] p-4 flex items-center gap-4 bg-white">
          <button onClick={onBack} className="text-[#8c8580] hover:text-[#d68f84] transition-colors">← 목록으로</button>
          <div>
            <h2 className="text-xl font-bold text-[#2c2520]">{doc.title}</h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-xs text-[#8c8580]">{doc.date}</span>
               <span className="text-xs bg-[#fdf9f0] text-[#d68f84] px-1.5 rounded border border-[#ebe5da]">JSON Format</span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full bg-white">
          {doc.content?.blocks ? (
            <div className="space-y-4">
              {doc.content.blocks.map((block, idx) => {
                if (block.type === 'heading') return <h3 key={idx} className="text-lg font-bold text-[#d68f84] mt-6 pb-2 border-b border-[#ebe5da]">{block.content}</h3>;
                if (block.type === 'list') return <div key={idx} className="bg-[#fdf9f0] p-3 rounded text-sm text-[#2c2520] pl-4 border-l-2 border-[#d68f84]">{block.content}</div>;
                if (block.type === 'code') return <pre key={idx} className="bg-[#3e3832] text-[#fdf9f0] p-4 rounded text-xs font-mono overflow-x-auto">{block.content}</pre>;
                return <p key={idx} className="text-[#2c2520] leading-relaxed">{block.content}</p>;
              })}
            </div>
          ) : (
            <div className="text-[#8c8580] italic">내용이 없습니다.</div>
          )}
          <details className="mt-12 pt-8 border-t border-[#ebe5da]">
            <summary className="text-xs text-[#8c8580] cursor-pointer hover:text-[#d68f84] mb-4">Dev Mode: Raw JSON Data</summary>
            <pre className="text-[10px] text-[#8c8580] bg-[#fdf9f0] p-4 rounded border border-[#ebe5da] overflow-auto">
              {JSON.stringify(doc.content, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  };

  // --- Views ---

  const ChatView = () => (
    <div className="flex flex-col h-full bg-[#fdf9f0]">
      <div className="h-14 border-b border-[#ebe5da] bg-white/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex bg-[#fdf9f0] p-1 rounded-lg border border-[#ebe5da]">
            {(['PM', 'DEV', 'DESIGNER'] as AgentType[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedAgent(role)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  selectedAgent === role ? 'bg-white text-[#d68f84] shadow-sm border border-[#ebe5da]' : 'text-[#8c8580] hover:text-[#d68f84]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          <span className="hidden md:inline text-sm text-[#8c8580] border-l border-[#ebe5da] pl-4">
            {selectedAgent === 'PM' && '회의록 정리 및 기획 지원'}
            {selectedAgent === 'DEV' && '코드 리뷰 및 기술 지원'}
            {selectedAgent === 'DESIGNER' && 'UI/UX 디자인 피드백'}
          </span>
        </div>
        {!isRightPanelOpen && (
          <button onClick={() => setIsRightPanelOpen(true)} className="text-[#8c8580] hover:text-[#d68f84]">
            <Menu size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.sender === 'user' ? 'bg-[#d68f84] text-white' : 'bg-white border border-[#ebe5da] text-[#8c8580]'
              }`}>
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className="flex flex-col gap-1 min-w-0">
                <div className={`flex items-center gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-sm font-semibold text-[#2c2520]">{msg.sender === 'user' ? 'Me' : 'Workiwi AI'}</span>
                  {msg.sender === 'ai' && msg.agentType && <AgentBadge type={msg.agentType} />}
                  <span className="text-xs text-[#8c8580]">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                <div className={`p-4 rounded-xl text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user' ? 'bg-[#d68f84] text-white rounded-tr-none' : 'bg-white border border-[#ebe5da] text-[#2c2520] rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                </div>

                {msg.sender === 'ai' && (
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={() => saveToDocs(msg)}
                      className="flex items-center gap-1 text-xs text-[#8c8580] hover:text-[#d68f84] px-2 py-1 hover:bg-[#fdf9f0] rounded transition-colors"
                      title="이 답변을 JSON 문서로 저장"
                    >
                      <FileJson size={14} />
                      JSON 저장
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-[#ebe5da] shrink-0">
        <div className="relative max-w-4xl mx-auto">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            placeholder={`${selectedAgent} 에이전트에게 질문하세요. (Shift+Enter로 줄바꿈)`}
            className="w-full bg-[#fdf9f0] border border-[#ebe5da] rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-[#d68f84] focus:bg-white resize-none h-[60px] shadow-sm text-sm transition-all text-[#2c2520] placeholder-[#8c8580]"
          />
          <button 
            onClick={handleSendMessage}
            className={`absolute right-3 top-3 p-1.5 rounded-lg transition-colors ${
              inputMessage.trim() ? 'bg-[#d68f84] text-white hover:bg-[#c0756a]' : 'bg-[#ebe5da] text-[#8c8580]'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-[10px] text-[#8c8580] mt-2">
          AI는 '{projectRules.techStack.join(', ')}' 환경을 기준으로 답변합니다.
        </p>
      </div>
    </div>
  );

  const DocsView = () => {
    if (selectedDoc) return <DocViewer doc={selectedDoc} onBack={() => setSelectedDoc(null)} />;

    return (
      <div className="p-8 h-full bg-[#fdf9f0] overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#2c2520] flex items-center gap-2">
                <FileText className="text-[#d68f84]" />
                문서함 (Docs)
              </h2>
              <p className="text-sm text-[#8c8580] mt-1">프로젝트의 모든 회의록과 기술 문서가 JSON 구조로 저장됩니다.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#ebe5da] overflow-hidden">
            <div className="flex items-center px-6 py-4 border-b border-[#ebe5da] bg-white gap-4">
               <Search size={18} className="text-[#8c8580]" />
               <input type="text" placeholder="문서 검색..." className="bg-transparent border-none focus:outline-none text-sm w-full placeholder-[#8c8580] text-[#2c2520]" />
            </div>
            
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fdf9f0] text-[#8c8580] font-medium border-b border-[#ebe5da]">
                <tr>
                  <th className="px-6 py-3 w-16">Type</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3 w-32">Format</th>
                  <th className="px-6 py-3 w-32">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe5da]">
                {docs.map(doc => (
                  <tr key={doc.id} onClick={() => setSelectedDoc(doc)} className="hover:bg-[#fdf9f0] transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                        doc.type === 'MEETING' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        doc.type === 'SPEC' ? 'bg-[#d68f84]/10 text-[#d68f84] border-[#d68f84]/20' :
                        'bg-stone-50 text-stone-600 border-stone-200'
                      }`}>
                        {doc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#2c2520] group-hover:text-[#d68f84]">
                      {doc.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-xs text-[#8c8580] font-mono">
                         <FileJson size={12} /> JSON
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#8c8580]">{doc.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const SettingsView = () => (
    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto bg-[#fdf9f0]">
      <h2 className="text-2xl font-bold text-[#2c2520] mb-6 flex items-center gap-2">
        <Settings className="text-[#d68f84]" />
        프로젝트 룰셋 설정
      </h2>
      <p className="text-[#8c8580] mb-8 bg-white p-4 rounded-lg border border-[#d68f84]/30 text-sm">
        💡 <b>Context Injection:</b> 이곳에서 설정한 규칙은 백엔드를 통해 Gemini의 System Prompt로 자동 변환되어 주입됩니다.
      </p>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-[#ebe5da] shadow-sm">
          <label className="block text-sm font-bold text-[#2c2520] mb-2">기술 스택 (Tech Stack)</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {projectRules.techStack.map((tech, i) => (
              <span key={i} className="px-3 py-1 bg-[#fdf9f0] text-[#2c2520] rounded-full text-sm border border-[#ebe5da] flex items-center gap-2">
                {tech}
                <button className="hover:text-[#d68f84]"><X size={12} /></button>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#ebe5da] shadow-sm">
          <label className="block text-sm font-bold text-[#2c2520] mb-2">코딩 컨벤션 (System Rules)</label>
          <textarea 
            className="w-full border border-[#ebe5da] rounded px-3 py-2 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-[#d68f84] resize-none text-[#2c2520]"
            value={projectRules.convention}
            onChange={(e) => setProjectRules({...projectRules, convention: e.target.value})}
          />
        </div>
      </div>
    </div>
  );

  const DashboardView = () => (
    <div className="p-8 h-full overflow-y-auto bg-[#fdf9f0]">
        <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-[#2c2520] mb-6 flex items-center gap-2">
                <LayoutDashboard className="text-[#d68f84]" />
                대시보드
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-[#ebe5da] shadow-sm">
                    <h3 className="text-[#8c8580] text-sm font-medium mb-2">최근 활동</h3>
                    <p className="text-2xl font-bold text-[#2c2520]">12건</p>
                </div>
                 <div className="bg-white p-6 rounded-xl border border-[#ebe5da] shadow-sm">
                    <h3 className="text-[#8c8580] text-sm font-medium mb-2">저장된 문서 (JSON)</h3>
                    <p className="text-2xl font-bold text-[#2c2520]">{docs.length}개</p>
                </div>
            </div>
        </div>
    </div>
  );

  const Sidebar = () => (
    <div className="w-64 bg-[#3e3832] text-[#fdf9f0] flex flex-col h-full border-r border-[#4a433e] shrink-0">
      <div className="p-4 border-b border-[#4a433e]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-[#d68f84] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">W</div>
          <span className="font-bold text-[#fdf9f0] text-lg">Workiwi</span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <select 
              className="w-full bg-[#2c2520] text-sm rounded p-2 border border-[#4a433e] focus:outline-none focus:border-[#d68f84] text-[#fdf9f0] appearance-none cursor-pointer pr-8"
              value={selectedProject.id}
              onChange={(e) => {
                const proj = projects.find(p => p.id === Number(e.target.value));
                if (proj) setSelectedProject(proj);
              }}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronRight size={14} className="absolute right-2 top-2.5 rotate-90 text-[#8c8580] pointer-events-none" />
          </div>
          <button 
            onClick={() => setShowNewProjectModal(true)}
            className="p-2 bg-[#d68f84] text-white rounded hover:bg-[#c0756a] transition-colors"
            title="새 프로젝트 생성"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {[
          { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: '대시보드' },
          { id: 'docs', icon: <FileText size={20} />, label: '문서함 (Docs)' },
          { id: 'chat', icon: <MessageSquare size={20} />, label: 'AI 채팅 (Agents)' },
          { id: 'settings', icon: <Settings size={20} />, label: '프로젝트 설정' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeTab === item.id ? 'bg-[#d68f84] text-white font-medium shadow-md' : 'text-[#fdf9f0]/70 hover:bg-[#4a433e] hover:text-[#fdf9f0]'
            }`}
          >
            {item.icon}{item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-[#4a433e]">
        <p className="text-xs font-semibold text-[#8c8580] mb-3 uppercase tracking-wider">Team Members</p>
        <div className="space-y-3">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#d68f84]"></div><span className="text-sm text-[#fdf9f0]/90">김개발 (Me)</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-stone-500"></div><span className="text-sm text-[#fdf9f0]/90">이기획</span></div>
        </div>
      </div>
    </div>
  );

  const ContextPanel = () => {
    if (!isRightPanelOpen) return null;
    return (
      <div className="w-80 bg-white border-l border-[#ebe5da] h-full overflow-y-auto flex flex-col shrink-0">
        <div className="p-4 border-b border-[#ebe5da] flex justify-between items-center bg-white">
          <h3 className="font-semibold text-[#2c2520] flex items-center gap-2"><Cpu size={18} className="text-[#d68f84]" />활성 컨텍스트</h3>
          <button onClick={() => setIsRightPanelOpen(false)} className="text-[#8c8580] hover:text-[#2c2520]"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-[#8c8580] uppercase tracking-wider mb-2">Project Ruleset</h4>
            <div className="bg-[#fdf9f0] rounded-lg p-3 space-y-3 border border-[#ebe5da]">
              <div>
                <span className="text-xs font-semibold text-[#2c2520] block mb-1">Tech Stack</span>
                <div className="flex flex-wrap gap-1">{projectRules.techStack.map((stack, i) => <span key={i} className="text-xs bg-white text-[#d68f84] px-1.5 py-0.5 rounded border border-[#d68f84]/30">{stack}</span>)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-[#2c2520] block mb-1">Convention</span>
                <p className="text-xs text-[#5c5550] leading-relaxed bg-white/50 p-1.5 rounded">{projectRules.convention}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-[#fdf9f0] font-sans text-[#2c2520] overflow-hidden">
      <Sidebar />
      <NewProjectModal />
      <main className="flex-1 flex flex-col relative min-w-0">
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'settings' && <SettingsView />}
        {activeTab === 'docs' && <DocsView />}
        {activeTab === 'dashboard' && <DashboardView />}
      </main>
      {activeTab === 'chat' && <ContextPanel />}
    </div>
  );
}