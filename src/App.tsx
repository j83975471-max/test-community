/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  Upload, 
  ChevronDown,
  HelpCircle,
  Gem,
  Send,
  History,
  Zap,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Submission {
  id: string;
  time: string;
  onionId: string;
  count: number;
  status: 'pending' | 'passed' | 'failed';
  reason?: string;
  image: string;
}

export default function App() {
  const DEADLINE = new Date('2026-04-29T23:59:59').getTime();
  
  // States
  const [onionId, setOnionId] = useState(() => localStorage.getItem('onion_user_id_final') || '');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showRewardRules, setShowRewardRules] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [records, setRecords] = useState<Submission[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isSyncing, setIsSyncing] = useState(false);
  const [localImageCache, setLocalImageCache] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('onion_image_cache_v2');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Derived Stats
  const validCount = useMemo(() => records.filter(r => r.status === 'passed').length, [records]);
  const pendingCount = useMemo(() => records.filter(r => r.status === 'pending').length, [records]);
  const submittedCount = useMemo(() => records.length, [records]);
  const isEnded = currentTime >= DEADLINE;

  // Sync Logic
  const syncWithFeishu = async (id: string) => {
    const trimmedId = id.trim();
    if (!trimmedId || trimmedId.length < 4) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/submissions/${encodeURIComponent(trimmedId)}`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Effects
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (onionId && onionId.trim().length >= 4) {
      syncWithFeishu(onionId);
      // Auto-poll every 60s
      const poll = setInterval(() => syncWithFeishu(onionId), 60000);
      return () => clearInterval(poll);
    }
  }, [onionId]);

  useEffect(() => {
    localStorage.setItem('onion_user_id_final', onionId);
  }, [onionId]);

  useEffect(() => {
    localStorage.setItem('onion_image_cache_v2', JSON.stringify(localImageCache));
  }, [localImageCache]);

  // Countdown Logic
  const countdown = useMemo(() => {
    const diff = Math.max(0, DEADLINE - currentTime);
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      mins: Math.floor((diff / 1000 / 60) % 60),
      secs: Math.floor((diff / 1000) % 60)
    };
  }, [currentTime]);

  // Catalyst Logic
  const catalyst = useMemo(() => {
    const c = validCount;
    if (c === 0) return { title: '先完成第一次有效分享', desc: '完成后即可领取 500 洋葱币基础参与奖励，进入成长阶段。', btn: '激活首个任务', color: 'bg-gradient-to-br from-onion-blue to-onion-purple text-white' };
    if (c < 5) return { title: '你已进入成长阶段', desc: `非常出色！距离 800 洋葱币阶梯奖励只剩 ${5-c} 次有效分享，冲向巅峰！`, btn: '🚀 继续提交，冲刺大奖！', color: 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' };
    if (c < 10) return { title: '解锁 1000 币倒计时', desc: `再接再厉！只需再完成 ${10-c} 次有效分享即可解锁 1000 洋葱币奖励池。`, btn: '🚀 继续提交，冲刺奖池！', color: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' };
    if (c < 15) return { title: '1500 币奖励近在咫尺', desc: `已经超越了大部分人！只需最后 ${15-c} 次分享，即可获得 1500 洋葱币奖赏。`, btn: '🚀 坚持到底，加油！', color: 'bg-gradient-to-br from-indigo-500 to-purple-700 text-white' };
    if (c < 20) return { title: '向 2000 币满额奖励冲刺', desc: `执行力拉满！再执行 ${20-c} 次任务，即可解锁成长阶段最高 2000 洋葱币奖励。`, btn: '🚀 锁定满额奖励！', color: 'bg-gradient-to-r from-onion-purple to-pink-500 text-white' };
    if (c < 30) return { title: '终极挑战：野餐垫大奖', desc: `常规任务已达成！距离获得“洋葱星球限定野餐垫”只差最后 ${30-c} 次有效分享！`, btn: '🚀 冲击终极大奖！', color: 'bg-gradient-to-r from-orange-500 to-red-600 text-white' };
    return { title: '成就：大满贯特级领主', desc: '恭喜！野餐垫大奖已在派发队列。继续分享可锁定高阶曝光资源等神秘加码。', btn: '查看我的奖励进度', color: 'bg-gradient-to-r from-onion-blue to-onion-gold text-white' };
  }, [validCount]);

  // Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && images.length < 2) {
      const reader = new FileReader();
      reader.onload = (event) => setImages([...images, event.target?.result as string]);
      reader.readAsDataURL(file);
    }
  };

  const handleTaskSubmit = async () => {
    if (!onionId || images.length === 0) {
      alert('请确保已填 ID 并上传至少 1 张截图');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const now = new Date();
      const datePart = [
        now.getFullYear(),
        (now.getMonth() + 1).toString().padStart(2, '0'),
        now.getDate().toString().padStart(2, '0')
      ].join('-');
      const timePart = [
        now.getHours().toString().padStart(2, '0'),
        now.getMinutes().toString().padStart(2, '0'),
        now.getSeconds().toString().padStart(2, '0')
      ].join(':');
      
      const timeStr = `${datePart} ${timePart}`;

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onionId: onionId.trim(),
          time: timeStr,
          count: images.length,
          image: images[0]
        })
      });

      if (response.ok) {
        // 🚀 核心优化：提交成功后，立即将本地 Base64 存入缓存
        // 这样在飞书回传预览图之前，或者预览图转码失败时，用户能直接看到刚才提交的原图
        setLocalImageCache(prev => ({ ...prev, [timeStr]: images[0] }));
        
        setImages([]);
        setToast({ show: true, message: '分享凭证提交成功！' });
        syncWithFeishu(onionId); // Immediate sync
      } else {
        const errorData = await response.json();
        console.error("DEBUG: Server Err Payload:", errorData);
        
        let displayMsg = "提交失败，请联系管理员";
        const d = errorData.detail || errorData.error;
        
        if (typeof d === 'string') {
          displayMsg = d;
        } else if (d) {
          // 深度尝试抓取飞书或标准的错误消息
          displayMsg = d.msg || d.message || d.error?.message || JSON.stringify(d);
        } else if (errorData.error) {
          displayMsg = errorData.error;
        }
        
        alert(`同步异常：${displayMsg}`);
      }
    } catch (error: any) {
      console.error("Submission fatal error:", error);
      alert('网络波动或服务器超时，请稍后刷新重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-screen pb-20 font-sans">
      
      {/* 1. Header Area */}
      <header className="bg-gradient-to-br from-onion-purple via-onion-purple to-onion-blue pt-8 pb-10 px-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute left-0 bottom-0 w-full h-20 bg-gradient-to-t from-onion-bg to-transparent"></div>
        <div className="relative z-10 flex justify-between items-start mb-4">
          <div className="bg-white/20 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
             <span className="text-[10px] text-white font-black uppercase tracking-widest">
               {isEnded ? '🚫 活动已截止' : '🎊 活动进行中 🎊'}
             </span>
          </div>
        </div>
        <div className="relative z-10 flex justify-between items-end">
          <div className="flex-1">
            <h1 className="text-white text-2xl font-black mb-1 leading-tight tracking-tight">洋葱高光分享官</h1>
            <h2 className="text-white/60 text-lg font-bold mb-4">专属福利任务 · 第二期</h2>
            <p className="text-white/40 text-[10px] font-bold flex items-center gap-1 uppercase tracking-widest">
              <Clock className="w-3 h-3" /> 2026.04.24 - 04.29 23:59
            </p>
          </div>

          {/* Countdown (Moved to Header) - Full Chinese for K12 Clarity */}
          {!isEnded && (
            <div className="bg-black/10 border border-white/10 backdrop-blur-md p-2.5 rounded-2xl flex flex-col items-center justify-center shrink-0 mb-1">
              <p className="text-[8px] text-white/70 font-black mb-1.5 tracking-wider">活动倒计时</p>
              <div className="flex gap-1.5">
                {[
                  { v: countdown.days, l: '天' },
                  { v: countdown.hours, l: '时' },
                  { v: countdown.mins, l: '分' },
                  { v: countdown.secs, l: '秒' }
                ].map(c => (
                  <div key={c.l} className="flex flex-col items-center leading-none px-0.5">
                    <span className="text-base font-black text-white font-mono italic tabular-nums">{String(c.v).padStart(2, '0')}</span>
                    <span className="text-[7px] font-black text-white/50 mt-1">{c.l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="px-5 -mt-6 relative z-20 space-y-3.5">
        
        {/* 1. Rewards Overview (Expanded Internal Space) */}
        <div className="mission-card p-2.5 space-y-3">
          <div className="mission-header text-gray-800 flex items-center">
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-sm shrink-0">🏆</span>
              <h3 className="text-sm font-black text-gray-800">奖励晋升路径</h3>
              <button 
                onClick={() => setShowRewardRules(true)}
                className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 active:scale-95"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
             <div className="p-2.5 bg-sky-50 rounded-2xl border border-sky-100 flex items-center gap-1.5">
               <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm text-sm">💰</div>
               <div className="min-w-0">
                 <p className="text-[10px] font-black text-onion-blue uppercase tracking-wider">基础奖励</p>
                 <p className="text-[11px] font-black text-gray-700 whitespace-nowrap">洋葱币大放送！</p>
               </div>
             </div>
             <div className="p-2.5 bg-gradient-to-br from-onion-purple to-indigo-600 rounded-2xl text-white flex items-center gap-1.5 shadow-md shadow-purple-500/20">
               <Trophy className="w-4 h-4 text-onion-gold shrink-0" />
               <div className="min-w-0">
                 <p className="text-[10px] font-black uppercase tracking-wider">高阶特权</p>
                 <p className="text-[11px] font-black whitespace-nowrap">实物奖励+圈主资格</p>
               </div>
             </div>
          </div>
        </div>

        {/* Spacer managed by space-y-5 */}

        <section className="mission-card p-4">
          <div className="mission-header text-gray-800 mb-3">
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-sm shrink-0">💯</span>
              <h3 className="text-sm font-black">有效分享挑战进度</h3>
            </div>
          </div>

          <div className="flex justify-between items-end mb-3">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black italic text-onion-blue">{validCount}</span>
                <span className="text-sm font-black text-gray-300">/ 30</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex gap-3 mb-3 justify-end leading-none">
                <div className="text-center">
                  <p className="text-[8px] text-gray-400 font-bold uppercase">总提交</p>
                  <p className="text-xs font-black text-gray-700">{submittedCount}</p>
                </div>
                <div className="text-center border-l border-gray-100 pl-3 relative">
                  {isSyncing && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-onion-blue rounded-full"
                    />
                  )}
                  <p className="text-[8px] text-gray-400 font-bold uppercase">审核中</p>
                  <p className="text-xs font-black text-blue-500 animate-pulse">{pendingCount}</p>
                </div>
              </div>
              <p className="text-[10px] font-bold text-gray-300 italic">
                {validCount >= 30 ? "高阶特权已激活！" : `再分享 ${30 - validCount} 次解锁高阶周边`}
              </p>
            </div>
          </div>

          <div className="relative mb-8 mx-3"> {/* Reduced from mb-12 to mb-8 for tighter layout */}
            {/* The Track */}
            <div className="h-3 relative bg-gray-100 rounded-full">
              {/* Progress Fill */}
              <motion.div 
                className="progress-fill shimmer-effect absolute h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${validCount === 0 ? 0 : Math.min(100, ((validCount - 1) / 29) * 100)}%` }}
              />

              {/* Milestones */}
              {[1, 5, 10, 15, 20, 30].map(m => (
                <div 
                  key={m}
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-20 ${
                    m === 30 
                      ? (validCount >= m ? 'w-6.5 h-6.5 bg-onion-gold border-white shadow-md' : 'w-6.5 h-6.5 bg-white border-onion-gold shadow-sm')
                      : (validCount >= m ? 'w-5 h-5 bg-onion-blue border-white shadow-sm' : 'w-5 h-5 bg-white border-gray-200')
                  }`}
                  style={{ left: `${((m - 1) / 29) * 100}%` }}
                >
                   <span className={`font-black leading-none select-none ${
                     m === 30 
                       ? 'text-[10px] ' + (validCount >= m ? 'text-white' : 'text-onion-gold')
                       : 'text-[9px] ' + (validCount >= m ? 'text-white' : 'text-gray-400')
                   }`}>
                     {m}
                   </span>
                </div>
              ))}
            </div>

            {/* Achievement Tags - High contrast and simplified */}
            <div className="relative h-14 mt-4"> 
               {[
                 { m: 1, r: '500币', icon: '🪙' },
                 { m: 5, r: '800币', icon: '🪙' },
                 { m: 10, r: '1000币', icon: '💰' },
                 { m: 15, r: '1500币', icon: '💰' },
                 { m: 20, r: '2000币', icon: '💎' },
                 { m: 30, r: '实物周边', icon: '🎁', gold: true }
               ].map((item, i) => (
                 <div 
                   key={i} 
                   className="absolute -translate-x-1/2 flex flex-col items-center"
                   style={{ left: `${((item.m - 1) / 29) * 100}%` }}
                 >
                   <div className={`w-0.5 h-3 mb-1 ${validCount >= item.m ? 'bg-onion-blue' : 'bg-gray-100'}`}></div>
                   <div className={`
                       flex flex-col items-center py-2 px-2 rounded-xl border transition-all duration-300
                       ${validCount >= item.m 
                         ? 'bg-onion-blue border-white shadow-lg' 
                         : item.gold 
                           ? 'bg-onion-gold/10 border-onion-gold/20 shadow-sm'
                           : 'bg-white border-gray-50 shadow-sm'
                       }
                     `}>
                       <span className={`text-sm mb-0.5 leading-none transition-all duration-300 ${validCount >= item.m ? 'scale-110 drop-shadow-md' : 'opacity-60 grayscale'}`}>
                         {item.icon}
                       </span>
                       <p className={`text-[8px] font-black leading-tight whitespace-nowrap ${
                         validCount >= item.m 
                           ? 'text-white' 
                           : item.gold ? 'text-onion-gold' : 'text-gray-700'
                       }`}>
                         {item.r}
                       </p>
                   </div>
                 </div>
               ))}
            </div>
          </div>

          {/* 5. Dynamic Catalyst Card */}
          <motion.div 
            key={validCount}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`catalyst-card mt-3 ${catalyst.color}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-sm font-black italic tracking-tight">{catalyst.title}</h4>
            </div>
            <p className="text-[11px] opacity-70 mb-4 font-medium leading-relaxed">{catalyst.desc}</p>
            <a href="#submit-zone" className="block w-full py-3 bg-white text-center rounded-2xl font-black text-xs leading-none shadow-lg active:scale-95 transition-transform tracking-widest uppercase">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {catalyst.btn}
              </span>
            </a>
          </motion.div>
        </section>

        {/* 6. Guide */}
        <div className="mission-card">
           <div className="mission-header text-gray-800">
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-sm shrink-0">❓</span>
              <h3 className="text-sm font-black">如何参与挑战</h3>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { t: "第一步：分享社区优质帖子", d: "选择你喜欢的帖子（自己的也可以！），点击右上角分享至微信/QQ好友、朋友圈或其他社交平台" },
              { t: "第二步：保留全屏真实分享截图", d: "分享完成后对分享的页面进行截图（如聊天框或朋友圈内容等），不对截图做任何处理和裁剪，作为有效凭证！" },
              { t: "第三步：进入活动页填写信息并提交", d: "在本页面“有效分享凭证提交”处输入洋葱 ID 并上传截图提交即可。" },
              { t: "第四步：等待审核，累计有效分享次数", d: "提交后，审核通过后才会计入有效次数，并同步更新奖励进度。" }
            ].map((step, i, arr) => (
              <div key={i} className="relative">
                <div className="p-3 bg-gray-50/30 rounded-2xl border border-gray-100/50 hover:bg-white transition-all duration-300">
                  <h4 className="text-[11px] font-black text-gray-600 mb-0.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-onion-blue/30"></span>
                    {step.t}
                  </h4>
                  <p className="text-[10px] font-medium text-gray-400 leading-tight pl-3.5 italic">{step.d}</p>
                </div>
                
                {i < arr.length - 1 && (
                  <div className="flex justify-center -my-1.5 relative z-10 scale-75">
                    <div className="bg-white p-0.5 rounded-full shadow-sm border border-purple-50">
                      <ChevronDown className="w-3.5 h-3.5 text-onion-purple/60 animate-bounce-subtle" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 7. Action: Form */}
        <section id="submit-zone" className={`mission-card ${isEnded ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
           <div className="mission-header text-gray-800">
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-sm shrink-0">🚀</span>
              <h3 className="text-sm font-black">有效分享凭证提交</h3>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none block mb-2">我的洋葱 ID</label>
              <input 
                type="number" 
                value={onionId}
                onChange={e => setOnionId(e.target.value)}
                placeholder=""
                className="input-base"
              />
              <p className="text-[9px] text-gray-400 font-bold mt-1.5 ml-1">不知道 ID？在 App - 我的 - 点击头像查看</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3 pr-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none block">分享凭证（最多2张）</label>
                <button 
                  onClick={() => setShowExamples(true)}
                  className="text-[10px] font-black text-onion-blue flex items-center gap-1 hover:opacity-70 transition-opacity"
                >
                  <Info className="w-3 h-3" />
                  查看提交示例
                </button>
              </div>
              <div className="flex gap-3">
                 {images.map((img, i) => (
                  <div key={i} className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 relative group">
                    <img src={img} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/50 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] group-hover:scale-110"
                    >×</button>
                  </div>
                ))}
                {images.length < 2 && (
                  <label className="w-20 h-20 bg-sky-50 border-2 border-dashed border-sky-100 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform">
                    <Upload className="w-5 h-5 text-sky-300" />
                    <span className="text-[8px] font-black text-sky-300 uppercase">点击上传截图</span>
                    <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                  </label>
                )}
              </div>
            </div>

            <button 
              onClick={handleTaskSubmit}
              disabled={isSubmitting || !onionId || images.length === 0}
              className="w-full h-11 bg-gradient-to-r from-onion-blue to-onion-purple text-white rounded-xl font-black italic text-sm shadow-lg shadow-blue-500/10 active:scale-95 flex items-center justify-center gap-2 transition-all disabled:opacity-20 translate-y-1 mb-1"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>立即提交凭证 <Send className="w-5 h-5" /></>}
            </button>
            <p className="text-[9px] text-gray-400 text-center font-bold italic mt-4">⚠️凭证提交成功后，葱葱将在24小时内完成审核～</p>
          </div>
        </section>

        {/* 8. Logs */}
        <section className="mission-card min-h-[300px]">
           <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-sm shrink-0">📜</span>
              <h3 className="text-sm font-black text-gray-800">有效凭证提交记录</h3>
            </div>
            <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
              {['all', 'pending', 'passed'].map(f => (
                <button 
                  key={f}
                  className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${activeFilter === f ? 'bg-white text-onion-purple shadow-sm' : 'text-gray-400'}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f === 'all' ? '全部' : f === 'pending' ? '审核中' : '已通过'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pb-2 max-h-[400px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {records
                .filter(r => activeFilter === 'all' || r.status === activeFilter)
                .map((log) => (
                <motion.div 
                  layout
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-gray-50 border border-gray-100 rounded-3xl flex gap-4 transition-all hover:bg-white"
                >
                  <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-purple-50 shrink-0 shadow-sm flex items-center justify-center">
                    {(localImageCache[log.time] || log.image) ? (
                      <img 
                        src={localImageCache[log.time] || log.image} 
                        referrerPolicy="no-referrer" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                        }}
                      />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-[11px] font-black text-gray-700 truncate mr-2 italic">{log.count} 张分享凭证</h4>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black italic tracking-tighter uppercase border ${
                        log.status === 'pending' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                        log.status === 'passed' ? 'bg-green-50 text-green-500 border-green-100' :
                        'bg-red-50 text-red-500 border-red-100'
                      }`}>
                         {log.status === 'pending' ? '待审核' : log.status === 'passed' ? '已通过' : '未通过'}
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">提交时间: {log.time}</p>
                    {log.reason && (
                      <p className="text-[8px] text-red-400 font-bold italic mt-1 leading-none">未通过原因: {log.reason}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {records.length === 0 && (
              <div className="text-center py-10 opacity-20 grayscale">
                <History className="w-12 h-12 mx-auto mb-4" />
                <p className="text-xs font-black italic">冒险尚未启航...</p>
              </div>
            )}
          </div>
        </section>

        {/* 10. FAQ Section */}
        <section className="space-y-4">
          <div className="mission-card !p-0">
            <button 
              onClick={() => setShowFaq(!showFaq)}
              className="w-full px-6 py-5 flex justify-between items-center text-xs font-black text-gray-700 italic tracking-widest uppercase hover:bg-gray-50/50 rounded-2xl transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-onion-blue" />
                <span>活动相关问题与解答</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-500 ${showFaq ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showFaq && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="px-6 pb-6 overflow-hidden"
                >
                  <div className="pt-2 space-y-6">
                    {[
                      { 
                        q: "1. 我该怎么参加这个活动？", 
                        a: "你只需要完成 4 步：\n• 将优质内容分享至外部渠道\n• 保留全屏真实分享截图\n• 在活动页填写洋葱ID并上传截图\n• 等待审核，通过后计入有效分享次数" 
                      },
                      { 
                        q: "2. 为什么我提交了，但有效分享次数没有增加？", 
                        a: "因为提交成功只代表系统已经记录了你的分享，不代表已经通过审核。\n只有审核通过后，才会计入有效分享次数和奖励进度。" 
                      },
                      { 
                        q: "3. 为什么我的提交次数和有效分享次数不一样？", 
                        a: "可能是因为：\n• 有些记录还在审核中\n• 有些记录未通过审核\n• 有些记录被判定为重复或无效\n所以页面上的“有效分享次数”才是奖励结算的最终依据。" 
                      },
                      { 
                        q: "4. 什么样的分享才算有效？", 
                        a: "只有真实、不重复、可核验的分享记录，才会计入有效分享次数。\n如果截图重复、同场景重复提交、信息缺失或无法判断真实性，可能不会被计入。" 
                      },
                      { 
                        q: "5. 哪些情况可能不会被计入有效分享？", 
                        a: "• 同一截图重复上传\n• 同一场景重复分享\n• 截图不清晰或关键信息缺失\n• 提交时间超过活动截止时间\n• 存在伪造、拼接、刷量等异常情况" 
                      },
                      { 
                        q: "6. 我现在已经完成了多少次有效分享？", 
                        a: "你可以直接在活动页查看自己的：\n• 已提交次数\n• 审核中次数\n• 有效分享次数\n其中，有效分享次数就是当前奖励进度的核心依据。" 
                      },
                      { 
                        q: "7. 奖励什么时候发放？", 
                        a: "当你的有效分享次数达到对应门槛后，奖励会按照活动规则发放。\n如果是洋葱币奖励，通常会在审核通过并满足条件后进入发放流程。" 
                      },
                      { 
                        q: "8. 为什么我达标了，但奖励还没到账？", 
                        a: "可能有以下几种情况：\n• 你的部分记录还在审核中\n• 奖励正在发放中\n• 当前奖励需要统一结算\n• 如果是实物奖励，还需要你补充填写领奖信息" 
                      },
                      { 
                        q: "9. 高阶奖励怎么获得？", 
                        a: "达到对应有效分享门槛后，你就有机会参与高阶奖励竞争。\n高阶奖励通常会根据累计有效分享次数进行排序；若次数相同，则按最先达成时间排序，名额有限，先到先得。" 
                      },
                      { 
                        q: "10. 为什么我已经分享了很多次，还是没拿到高阶奖励？", 
                        a: "高阶奖励属于限量竞争奖励。\n即使你已经达到参与门槛，也需要和其他用户一起按规则排序，所以达到门槛不等于一定获奖。" 
                      },
                      { 
                        q: "11. 我提交错了洋葱ID怎么办？", 
                        a: "如果洋葱ID填写错误，可能导致记录无法正确归属，可输入正确的洋葱ID重新上传分享截图。" 
                      },
                      { 
                        q: "12. 活动截止后还能补交吗？", 
                        a: "不能。\n活动结束后将不再接收新的提交记录，也不再补录，请务必在截止时间前完成提交。" 
                      },
                      { 
                        q: "13. 活动结果在哪里看？", 
                        a: "你可以在活动页查看自己的记录和奖励进度，活动结束后葱葱会在4月30日18点通过提及消息公布获奖情况和高阶奖励排名情况。" 
                      }
                    ].map((f, i) => (
                      <div key={i} className="group border-l-2 border-onion-blue/10 pl-4 hover:border-onion-blue transition-colors duration-300">
                        <p className="text-[11px] font-black text-gray-700 mb-1.5 leading-tight group-hover:text-onion-blue transition-colors">
                           {f.q}
                        </p>
                        <div className="text-[10px] text-gray-400 font-medium leading-relaxed whitespace-pre-wrap">
                          {f.a}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

      </main>

      {/* --- Reward Rules Modal --- */}
      <AnimatePresence>
        {showRewardRules && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowRewardRules(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="bg-onion-purple p-6 pb-8 text-white relative">
                <button 
                  onClick={() => setShowRewardRules(false)}
                  className="absolute right-6 top-6 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-6 bg-white rounded-full"></div>
                  <h3 className="text-xl font-black italic">奖励说明</h3>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed font-bold">
                  本次活动准备了基础、成长和高阶大奖，分享越多，奖励越多！✨
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-10">
                {/* Section 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black">01</span>
                    <h4 className="text-sm font-black text-gray-800">基础奖励：先参与先得</h4>
                  </div>
                  <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                    <p className="text-[11px] text-gray-600 leading-normal">
                      完成 <span className="text-orange-600 font-bold">首次有效分享</span>，即可领取 <span className="text-orange-600 font-bold">500 洋葱币</span>
                    </p>
                  </div>
                </div>

                {/* Section 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-black">02</span>
                    <h4 className="text-sm font-black text-gray-800">成长奖励：阶梯领好礼</h4>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {[
                      { c: 5, r: 800 },
                      { c: 10, r: 1000 },
                      { c: 15, r: 1500 },
                      { c: 20, r: 2000 }
                    ].map((item, i) => (
                      <div key={i} className={`flex justify-between items-center p-3 text-[11px] ${i % 2 === 0 ? 'bg-purple-50/30' : ''}`}>
                        <span className="text-gray-500 font-bold">累计 {item.c} 次有效分享</span>
                        <span className="text-purple-600 font-black">+{item.r} 洋葱币</span>
                      </div>
                    ))}
                    <div className="p-3 bg-gray-50 text-[10px] text-gray-400 font-bold italic leading-tight border-t border-gray-100">
                      💡 洋葱币奖励将于达成次数后 24h 内自动发放。
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black">03</span>
                    <h4 className="text-sm font-black text-gray-800">终极挑战：高阶特权大奖</h4>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl text-white shadow-lg space-y-4 shadow-purple-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl shrink-0">🧺</div>
                      <div>
                        <p className="text-[12px] font-black mb-0.5">洋葱星球限定野餐垫</p>
                        <p className="text-[10px] opacity-70">完成 30 次有效分享即可获得 1 张！</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 border-t border-white/20 pt-3">
                      <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1 shrink-0"></div>
                        <p className="text-[10px] leading-relaxed"><span className="font-black text-yellow-300">学习类内容：</span>可竞争内容 24h 置顶位（每天每学段 3 席）</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1 shrink-0"></div>
                        <p className="text-[10px] leading-relaxed"><span className="font-black text-yellow-300">非学习类内容：</span>可竞争一周圈主轮值资格（每周 8 席）</p>
                      </div>
                    </div>

                    <div className="bg-black/10 p-2.5 rounded-xl text-[9px] leading-relaxed opacity-90 italic">
                      🏆 评选规则：优先按照“累计有效分享次数”排序。若次数相同，则按“最先达成时间”排序，先到先得！
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-2">
                <button 
                  onClick={() => setShowRewardRules(false)}
                  className="w-full h-14 bg-onion-purple text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl shadow-purple-500/20 active:scale-[0.98] transition-all"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Submission Examples Modal --- */}
      <AnimatePresence>
        {showExamples && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md" 
              onClick={() => setShowExamples(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-white/20"
            >
              <div className="bg-gradient-to-br from-onion-blue to-indigo-700 p-8 text-white relative">
                <button 
                  onClick={() => setShowExamples(false)}
                  className="absolute right-6 top-6 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-6 bg-white rounded-full"></div>
                  <h3 className="text-xl font-black italic">提报凭证指南</h3>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed font-bold">
                  为了保证审核快速通过，请确保你的截图包含完整的分享信息哦！📸
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Correct Example */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-black italic">✓</span>
                      <h4 className="text-sm font-black text-gray-800 italic">正确示例</h4>
                    </div>
                    <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded-full">容易通过</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* 图1 */}
                    <div className="space-y-2">
                      <div className="relative aspect-[9/16] bg-gray-50 rounded-2xl overflow-hidden border border-green-500/20 group">
                        <img 
                          src="https://fp.yangcong345.com/shadow/image111-5fc97e9d2cd6855551d016d985dc61c1__w.png" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain bg-white"
                        />
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-md scale-90 origin-left">就要这种！</div>
                      </div>
                      <p className="text-[8px] text-gray-500 font-black italic leading-tight text-center px-1">
                        社交平台群聊/私聊分享
                      </p>
                    </div>

                    {/* 图2 */}
                    <div className="space-y-2">
                      <div className="relative aspect-[9/16] bg-gray-50 rounded-2xl overflow-hidden border border-green-500/20 group">
                        <img 
                          src="https://fp.yangcong345.com/shadow/image222-880bbbacb5404958338e54a26f8fe9c3__w.png" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain bg-white"
                        />
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-md scale-90 origin-left">就要这种！</div>
                      </div>
                      <p className="text-[8px] text-gray-500 font-black italic leading-tight text-center px-1">
                        社交平台公开分享
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 pt-0">
                <button 
                  onClick={() => setShowExamples(false)}
                  className="w-full h-14 bg-gradient-to-r from-onion-blue to-indigo-600 text-white rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all uppercase"
                >
                  这就去搞定它！
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-12 text-center pb-20 opacity-20">
         <p className="text-[10px] font-black italic tracking-[0.6em] uppercase">洋葱学园 · 研究员之家</p>
      </footer>

      {/* Toast Alert */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm"
          >
            <div className="mission-card p-8 text-center max-w-xs w-full">
               <div className="w-16 h-16 bg-onion-purple text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <CheckCircle2 className="w-8 h-8" />
               </div>
               <h3 className="text-lg font-black text-gray-800 mb-2 italic">{toast.message}</h3>
               <p className="text-xs text-gray-400 font-bold mb-8 italic text-balance">你提交的分享凭证已记录！葱葱将会在24小时内更新审核状态哦～</p>
               <button 
                 onClick={() => setToast({ ...toast, show: false })}
                 className="w-full h-14 bg-gradient-to-r from-onion-purple to-indigo-600 text-white rounded-2xl font-black text-sm tracking-widest uppercase shadow-lg shadow-purple-500/30 active:scale-95 transition-transform"
               >继续挑战，冲刺大奖🎊</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
