import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Send, MessageCircle } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Message { id: string; text: string; sender: 'user' | 'bot'; timestamp: Date; }

function generateResponse(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('cost') || m.includes('price') || m.includes('budget')) return 'To estimate project costs, go to the Plan Project page and enter your location coordinates. Our AI engine uses real city-level cost data from 800+ cities across 5 countries. Costs vary by terrain - urban areas are baseline, while mountain deployments can cost 60% more.';
  if (m.includes('tower') || m.includes('5g')) return 'Telecom towers are critical infrastructure for 5G and fiber deployment. Base tower cost is around $500K with $150K installation. Use the map to find nearby towers and plan your deployment route.';
  if (m.includes('fiber') || m.includes('cable')) return 'Fiber deployment involves trenching, cable laying, and connection. Average cost ranges from 28,000 to 80,000 per km depending on location. The map shows fiber deployment paths between your location and nearby cities.';
  if (m.includes('worker') || m.includes('labor')) return 'Project workforce depends on scope. Typically 5-15 workers for fiber deployment. Skilled labor costs 1.3x more but completes work faster. The AI estimator calculates optimal worker count based on tower count and fiber distance.';
  if (m.includes('timeline') || m.includes('days') || m.includes('duration')) return 'Project duration depends on fiber distance and tower count. Each tower takes about 5 days, each km of fiber takes about 2 days. Mountain and forest terrain can add 20-60% to the timeline.';
  if (m.includes('maintain')) return 'Maintenance is critical. Budget 5,000-10,000 per km annually for fiber maintenance and tower upkeep. Regular maintenance scheduling can extend infrastructure lifespan by 30-40%.';
  if (m.includes('hello') || m.includes('hi') || m.includes('hey')) return 'Hello! I am CostraSphere AI assistant. I can help you with telecom infrastructure planning, cost estimation, and project insights. Ask me about costs, towers, fiber deployment, worker requirements, or timelines.';
  if (m.includes('map') || m.includes('location')) return 'Use the Plan Project page to interact with the map. Click anywhere to set your location, or use the "My Location" button for GPS detection. The system will show nearby towers, fiber paths, and cost overlays.';
  if (m.includes('otp') || m.includes('verify') || m.includes('email')) return 'OTP verification is required during registration. A 6-digit code is sent to your email via Gmail SMTP. Enter it on the verification page. OTPs expire in 10 minutes. You can request a new one if it expires.';
  if (m.includes('password') || m.includes('forgot') || m.includes('reset')) return 'Forgot your password? Click "Forgot Password?" on the login page. Enter your email, receive an OTP, verify it, then set a new password. The OTP is sent via real Gmail SMTP.';
  return 'I can help you with telecom infrastructure planning. Try asking about costs, towers, fiber deployment, worker requirements, timelines, map features, or OTP verification. What would you like to know?';
}

export const Chatbot: React.FC = () => {
  const { auth } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! I am CostraSphere AI assistant. I can help you with telecom infrastructure planning, cost estimation, and project insights. Ask me about costs, towers, fiber deployment, map features, or OTP verification.', sender: 'bot', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const userText = input;
    setInput('');
    setLoading(true);

    try {
      const responseText = generateResponse(userText);
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: responseText, sender: 'bot', timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
      if (auth.user) {
        await supabase.from('chat_history').insert({ user_id: auth.user.id, message: userText, response: responseText });
      }
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: 'Sorry, an error occurred.', sender: 'bot', timestamp: new Date() }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 py-8 px-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><MessageCircle className="w-9 h-9 text-violet-400" />CostraSphere AI Assistant</h1>
          <p className="text-slate-400 mt-1">Ask anything about telecom infrastructure planning</p>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 flex flex-col flex-1 mb-6">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[350px] max-h-[450px]">
            {messages.map((msg, i) => (
              <motion.div key={msg.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-5 py-3 rounded-lg ${
                  msg.sender === 'user' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none' : 'bg-white/10 text-slate-200 rounded-bl-none'}`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className={`text-xs mt-1.5 ${msg.sender === 'user' ? 'text-violet-200' : 'text-slate-500'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex justify-start"><div className="bg-white/10 text-slate-200 px-5 py-3 rounded-lg rounded-bl-none flex items-center gap-2"><LoadingSpinner size="w-4 h-4" /><span className="text-sm">Thinking...</span></div></div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-violet-500/5 p-4">
            <form onSubmit={handleSend} className="flex gap-3">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about costs, towers, fiber, workers, maps..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all" disabled={loading} />
              <button type="submit" disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-5 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-500/20">
                <Send className="w-4 h-4" /><span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {['How much does 5G tower installation cost?', 'What is the typical fiber deployment timeline?', 'How many workers do I need for 100km fiber?', 'How does the map-based planning work?'].map((q, i) => (
            <button key={i} onClick={() => setInput(q)}
              className="text-left p-3 bg-white/5 border border-violet-500/5 hover:border-violet-500/20 rounded-lg transition-colors text-sm text-slate-400 hover:text-violet-300 font-medium">{q}</button>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
