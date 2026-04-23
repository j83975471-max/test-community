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
  AlertCircle,
  Share2,
  Image as ImageIcon,
  UploadCloud,
  ChevronRight,
  ChevronLeft
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [expandedRecordIds, setExpandedRecordIds] = useState<string[]>([]);
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

  useEffect(() => {
    if (showFaq || showRewardRules || showExamples || previewImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showFaq, showRewardRules, showExamples, previewImage]);

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
    if (isEnded) {
      if (c === 0) return { title: '活动已圆满结束', desc: '很遗憾，你在本次活动中未能完成分享任务。期待下期福利活动你的参与！', btn: '', color: 'bg-gray-100 text-gray-500' };
      if (c < 5) return { title: `已完成${c}次分享，获得500洋葱币`, desc: `本次活动已截止。你获得了500洋葱币，距离1300洋葱币奖励仅差${5-c}次分享，一步之遥！`, btn: '', color: 'bg-gradient-to-br from-onion-blue to-onion-purple text-white' };
      if (c < 10) return { title: `已完成${c}次分享，总计获得1300洋葱币`, desc: `本次活动已截止。你最终斩获了1300洋葱币！距离2300洋葱币奖励仅差${10-c}次分享。`, btn: '', color: 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' };
      if (c < 15) return { title: `已完成${c}次分享，总计获得2300洋葱币`, desc: `本次活动已截止。你最终斩获了2300洋葱币！距离3800洋葱币奖励仅差${15-c}次分享。`, btn: '', color: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' };
      if (c < 20) return { title: `已完成${c}次分享，总计获得3800洋葱币`, desc: `本次活动已截止。超越大部分人！距离5800满额洋葱币仅差${20-c}次分享。`, btn: '', color: 'bg-gradient-to-br from-indigo-500 to-purple-700 text-white' };
      if (c < 30) return { title: `已完成${c}次分享，总计获得5800满额洋葱币`, desc: `满额币奖励达成！非常遗憾，距离终极大奖“洋葱限定野餐垫”只差最后${30-c}次分享。`, btn: '', color: 'bg-gradient-to-r from-onion-purple to-pink-500 text-white' };
      return { title: `已完成${c}次分享，大满贯特级领主`, desc: '活动圆满结束！恭喜你斩获最高荣誉及野餐垫大奖，奖励核对后将尽快发放！', btn: '', color: 'bg-gradient-to-r from-onion-blue to-onion-gold text-white' };
    }

    if (c === 0) return { title: '先完成第一次有效分享', desc: '完成后即可领取 500 洋葱币基础参与奖励，进入成长阶段。', btn: '激活首个任务', color: 'bg-gradient-to-br from-onion-blue to-onion-purple text-white' };
    if (c < 5) return { title: '你已进入成长阶段', desc: `非常出色！距离 800 洋葱币阶梯奖励只剩 ${5-c} 次有效分享，冲向巅峰！`, btn: '🚀 继续提交，冲刺大奖！', color: 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' };
    if (c < 10) return { title: '解锁 1000 币倒计时', desc: `再接再厉！只需再完成 ${10-c} 次有效分享即可解锁 1000 洋葱币奖励池。`, btn: '🚀 继续提交，冲刺奖池！', color: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' };
    if (c < 15) return { title: '1500 币奖励近在咫尺', desc: `已经超越了大部分人！只需最后 ${15-c} 次分享，即可获得 1500 洋葱币奖赏。`, btn: '🚀 坚持到底，加油！', color: 'bg-gradient-to-br from-indigo-500 to-purple-700 text-white' };
    if (c < 20) return { title: '向 2000 币满额奖励冲刺', desc: `执行力拉满！再执行 ${20-c} 次任务，即可解锁成长阶段最高 2000 洋葱币奖励。`, btn: '🚀 锁定满额奖励！', color: 'bg-gradient-to-r from-onion-purple to-pink-500 text-white' };
    if (c < 30) return { title: '终极挑战：野餐垫大奖', desc: `常规任务已达成！距离获得“洋葱星球限定野餐垫”只差最后 ${30-c} 次有效分享！`, btn: '🚀 冲击终极大奖！', color: 'bg-gradient-to-r from-orange-500 to-red-600 text-white' };
    return { title: '成就：大满贯特级领主', desc: '恭喜！野餐垫大奖已在派发队列。继续分享可锁定高阶曝光资源等神秘加码。', btn: '查看我的奖励进度', color: 'bg-gradient-to-r from-onion-blue to-onion-gold text-white' };
  }, [validCount, isEnded]);

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
    <div className="max-w-[480px] mx-auto min-h-screen pb-6 font-sans">
      
      {/* 1. Header Area */}
      <header className="bg-gradient-to-br from-onion-purple via-onion-purple to-onion-blue pt-8 pb-10 px-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute left-0 bottom-0 w-full h-20 bg-gradient-to-t from-onion-bg to-transparent"></div>
        <div className="relative z-10 flex justify-between items-start mb-4">
          <button 
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.close();
              }
            }}
            className="w-7 h-7 flex items-center justify-center bg-white/20 rounded-full border border-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowFaq(true)}
            className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-white" />
            <span className="text-xs text-white font-black">活动问答</span>
          </button>
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-center -mt-2">
            <div className="flex-1 pr-4 relative z-10">
              <h1 className="text-white text-2xl sm:text-[28px] font-black mb-1 leading-tight tracking-tight whitespace-nowrap">洋葱高光分享官</h1>
              <h2 className="text-white/60 text-lg sm:text-[1.1rem] font-bold mb-4 leading-none whitespace-nowrap">专属福利任务 · 第二期</h2>
              <p className="text-white/40 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 uppercase tracking-widest leading-none whitespace-nowrap">
                <Clock className="w-3 h-3 shrink-0" /> 2026.04.24 - 04.29 23:59
              </p>
            </div>
            {/* Mascot Hero Image */}
            <div className="w-[140px] h-[140px] sm:w-[190px] sm:h-[190px] shrink-0 -my-6 pointer-events-none relative z-0 flex items-center justify-center pl-2">
              <img 
                src="https://fp.yangcong345.com/shadow/image1111-5ee001f816147c155fbc2794f49c6de1__w.png" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain scale-[1.15]"
                alt="Hero"
              />
            </div>
          </div>

          {/* Countdown (Horizontal Strip) */}
          {!isEnded ? (
            <div className="bg-white/10 border border-white/10 backdrop-blur-md py-2.5 px-5 rounded-full flex flex-row items-center justify-between w-full mt-2 shadow-sm">
              <p className="text-xs sm:text-sm text-white/90 font-black tracking-widest">距离活动结束还有</p>
              <div className="flex flex-row items-baseline gap-3 sm:gap-5">
                {[
                  { v: countdown.days, l: '天' },
                  { v: countdown.hours, l: '时' },
                  { v: countdown.mins, l: '分' },
                  { v: countdown.secs, l: '秒' }
                ].map(c => (
                  <div key={c.l} className="flex flex-row items-baseline gap-0.5">
                    <span className="text-xl sm:text-[22px] font-black text-white font-mono tabular-nums leading-none tracking-tight">{String(c.v).padStart(2, '0')}</span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-white/50">{c.l}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/10 border border-white/10 backdrop-blur-md py-3 px-5 rounded-full flex flex-row items-center justify-center w-full mt-2 shadow-sm gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
              <p className="text-sm text-white font-black tracking-[0.2em]">本期活动已圆满截止</p>
            </div>
          )}
        </div>
      </header>

      <main className="px-5 -mt-6 relative z-20 space-y-3.5">
        
        <section className="bg-white rounded-[24px] pt-5 px-5 pb-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
          {(() => {
            const milestonesData = [
              { m: 1, r: '500 洋葱币', sum: '500洋葱币' },
              { m: 5, r: '800 洋葱币', sum: '1300洋葱币' },
              { m: 10, r: '1000 洋葱币', sum: '2300洋葱币' },
              { m: 15, r: '1500 洋葱币', sum: '3800洋葱币' },
              { m: 20, r: '2000 洋葱币', sum: '5800洋葱币' },
              { m: 30, r: '实物周边', sum: '终极大奖野餐垫' }
            ];
            const nextTarget = milestonesData.find(item => item.m > validCount) || milestonesData[milestonesData.length - 1];
            const currentTier = [...milestonesData].reverse().find(item => item.m <= validCount);
            const diffCount = Math.max(0, nextTarget.m - validCount);

            let endedHintText: React.ReactNode = "";
            if (isEnded) {
               if (validCount === 0) {
                 endedHintText = `本次活动已结束，很遗憾您未获得奖励`;
               } else if (validCount >= 30) {
                 endedHintText = (
                  <div className="flex flex-col gap-0.5">
                    <p>已完成{validCount}次分享，总计获得 <span className="text-[#546bfa] font-bold">满额奖励及野餐垫！</span></p>
                  </div>
                 );
               } else {
                 const isExactTier = validCount === currentTier?.m;
                 const rewardText = currentTier?.sum;
                 if (isExactTier) {
                   endedHintText = (
                     <div className="flex flex-col gap-0.5">
                       <p>已完成{validCount}次分享，{validCount === 1 ? '获得' : '总计获得'} <span className="text-[#546bfa] font-bold">{rewardText}</span></p>
                     </div>
                   );
                 } else {
                   endedHintText = (
                     <div className="flex flex-col gap-0.5">
                       <p>已完成{validCount}次分享，{validCount < 5 ? '获得' : '总计获得'} <span className="text-[#546bfa] font-bold">{rewardText}</span></p>
                       <p>距离 {nextTarget.sum} 仅 <span className="text-[#ff6b2c] font-bold">一步之遥！</span></p>
                     </div>
                   );
                 }
               }
            }

             return (
               <>
                 {/* Header Row */}
                 <div className="flex justify-between items-center mb-1">
                   <div className="flex items-center gap-2">
                     <div className="w-[18px] h-[18px] bg-[#546bfa] rounded-full flex justify-center items-center text-white text-[10px] font-bold shrink-0">
                       <span className="relative -top-[1px]">☻</span>
                     </div>
                     <h3 className="text-[15px] font-extrabold text-gray-800 tracking-wide">我的分享进度</h3>
                   </div>
                   <button 
                     onClick={() => setShowRewardRules(true)}
                     className="px-2.5 py-[3px] bg-[#fcfaff] text-[#7879f1] border border-[#eceaf9] rounded-full text-[11px] font-bold transition-all active:scale-95 flex items-center gap-0.5"
                   >
                     奖励规则 <span className="text-[10px] relative top-[0.5px]">›</span>
                   </button>
                 </div>

                 {/* Numbers & Stats Row */}
                 <div className="flex justify-between items-end mb-0.5">
                   <div className="flex items-baseline gap-1">
                     <span className="text-[40px] font-black text-[#546bfa] leading-none tracking-tight">{validCount}</span>
                     <span className="text-[13px] font-bold text-gray-600 mb-[3px]">/ 30 次</span>
                   </div>
                 </div>

                 {/* Hint Text Row */}
                 <div className="mb-1.5">
                   <div className="text-[12px] font-bold text-gray-600">
                     {isEnded ? (
                       <>{endedHintText}</>
                     ) : validCount >= 30 ? (
                       "高阶特权已激活！" 
                     ) : (
                       <>再完成 <span className="text-[#ff6b2c]">{diffCount}</span> 次，可获得 <span className="text-[#ff6b2c] text-[13px]">{nextTarget.r}</span></>
                     )}
                   </div>
                 </div>

                 {/* Progress Bar Container */}
                 <div className="relative mt-3 mb-1 mx-1">
                   {/* Base track */}
                   <div className="h-1.5 w-full bg-[#f0f2fa] rounded-full">
                     {/* Fill */}
                     <motion.div 
                       className="absolute top-0 left-0 h-1.5 rounded-full bg-gradient-to-r from-[#7b81f9] to-[#9fa5ff] will-change-[width]"
                       initial={{ width: 0 }}
                       animate={{ width: `${validCount === 0 ? 0 : Math.min(100, (validCount / 30) * 100)}%` }}
                     >
                       {/* Thumb */}
                       {validCount > 0 && <div className="absolute top-1/2 -right-[5px] -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_1px_4px_rgba(123,129,249,0.5)] border-2 border-[#9fa5ff]"></div>}
                     </motion.div>
                   </div>
                   
                   {/* Gift icon at the end */}
                   <div className="absolute -top-7 -right-3 w-9 h-9 z-10 pointer-events-none drop-shadow-md">
                     <span className="text-[26px]">🎁</span>
                   </div>

                   {/* Scale marks and labels */}
                   <div className="relative w-full h-8 mt-[3px] inline-block">
                     {[1, 5, 10, 15, 20, 30].map((m) => {
                       const isAchieved = validCount >= m;
                       return (
                         <div key={m} className={`absolute flex flex-col items-center -translate-x-1/2 ${m === 30 ? '-ml-0.5' : ''}`} style={{ left: `${(m / 30) * 100}%` }}>
                           <div className="w-px h-1.5 bg-gray-300/80 mb-1.5"></div>
                           {isAchieved ? (
                             <div className="px-[5px] py-[2px] bg-[#7879f1] rounded-full text-white text-[9px] font-bold leading-none shadow-sm whitespace-nowrap -mt-[2px]">
                               {m}次
                             </div>
                           ) : (
                             <div className="text-gray-400 font-medium text-[10px] leading-none whitespace-nowrap">
                               {m}次
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 </div>
               </>
             );
          })()}

          {/* Action Button Only */}
          {!isEnded && (
            <motion.div 
              key={validCount}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3"
            >
              <a href="#submit-zone" className={`block w-full py-3.5 text-center rounded-[16px] font-black text-[15px] shadow-[0_4px_14px_rgba(84,107,250,0.2)] active:scale-95 transition-transform ${catalyst.color}`}>
                {catalyst.btn}
              </a>
            </motion.div>
          )}
        </section>

        {/* 6. Guide */}
        {!isEnded && (
          <section className="bg-white rounded-[24px] pt-4 px-4 pb-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-[18px] h-[18px] bg-[#546bfa] rounded-full flex justify-center items-center text-white text-[10px] font-bold shrink-0">
                 <span className="relative">?</span>
              </div>
              <h3 className="text-[15px] font-extrabold text-gray-800 tracking-wide">如何参与活动</h3>
            </div>
            
            <div className="flex items-start justify-between w-full pt-1">
              {/* Step 1 */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                 <div className="w-[46px] h-[46px] rounded-full bg-[#f0f4ff] flex items-center justify-center shrink-0 shadow-sm border border-[#e5ebff]">
                   <Share2 className="w-5 h-5 text-[#546bfa]" />
                 </div>
                 <div className="flex flex-col items-center mt-0.5">
                   <span className="text-[12px] font-bold text-[#444d63] leading-[1.3] whitespace-nowrap">分享帖子到</span>
                   <span className="text-[12px] font-bold text-[#444d63] leading-[1.3] whitespace-nowrap">其他平台</span>
                 </div>
              </div>
              
              {/* Arrow */}
              <div className="text-[#d8defc] mt-4 flex-[0.3] flex justify-center shrink-0">
                <ChevronRight className="w-[18px] h-[18px]" strokeWidth={3.5} />
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                 <div className="w-[46px] h-[46px] rounded-full bg-[#f0f4ff] flex items-center justify-center shrink-0 shadow-sm border border-[#e5ebff]">
                   <ImageIcon className="w-5 h-5 text-[#546bfa]" />
                 </div>
                 <div className="flex flex-col items-center mt-0.5">
                   <span className="text-[12px] font-bold text-[#444d63] leading-[1.3] whitespace-nowrap">截图保存</span>
                   <span className="text-[12px] font-bold text-[#444d63] leading-[1.3] whitespace-nowrap">分享界面</span>
                 </div>
              </div>

              {/* Arrow */}
              <div className="text-[#d8defc] mt-4 flex-[0.3] flex justify-center shrink-0">
                <ChevronRight className="w-[18px] h-[18px]" strokeWidth={3.5} />
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                 <div className="w-[46px] h-[46px] rounded-full bg-[#f0f4ff] flex items-center justify-center shrink-0 shadow-sm border border-[#e5ebff]">
                   <UploadCloud className="w-5 h-5 text-[#546bfa]" />
                 </div>
                 <div className="flex flex-col items-center mt-0.5">
                   <span className="text-[12px] font-bold text-[#444d63] leading-[1.3] whitespace-nowrap">上传截图</span>
                   <span className="text-[12px] font-bold text-[#444d63] leading-[1.3] whitespace-nowrap">等待审核</span>
                 </div>
              </div>

              {/* Arrow */}
              <div className="text-[#d8defc] mt-4 flex-[0.3] flex justify-center shrink-0">
                <ChevronRight className="w-[18px] h-[18px]" strokeWidth={3.5} />
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                 <div className="w-[46px] h-[46px] rounded-full bg-[#f0f4ff] flex items-center justify-center shrink-0 shadow-sm border border-[#e5ebff]">
                   <Clock className="w-5 h-5 text-[#546bfa]" />
                 </div>
                 <div className="flex flex-col items-center mt-0.5">
                   <span className="text-[12px] font-bold text-[#444d63] leading-[1.3] whitespace-nowrap">审核完成</span>
                   <span className="text-[12px] font-bold text-[#444d63] leading-[1.3] whitespace-nowrap">更新进度</span>
                 </div>
              </div>
            </div>
          </section>
        )}

        {/* 7. Action: Form */}
        {!isEnded && (
          <section id="submit-zone" className="mission-card">
             <div className="flex items-center gap-2 mb-4">
               <div className="w-[20px] h-[20px] bg-gradient-to-b from-[#8778fc] to-[#6d5af9] rounded-[4px] flex justify-center items-center text-white shrink-0 shadow-sm">
                 <Upload className="w-3 h-3" strokeWidth={3} />
               </div>
               <h3 className="text-[16px] font-extrabold text-[#444d63] tracking-wide">提交分享凭证</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[13px] font-normal text-black leading-none block mb-2">洋葱ID（必填）</label>
                <input 
                  type="number" 
                  value={onionId}
                  onChange={e => setOnionId(e.target.value)}
                  placeholder=""
                  className="input-base"
                />
                <p className="text-[11px] text-gray-400 font-bold mt-1.5 ml-1">不知道 ID？在 App - 我的 - 点击头像查看</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3 pr-2">
                  <label className="text-[13px] font-normal text-black leading-none block">分享凭证（最多2张）</label>
                  <button 
                    onClick={() => setShowExamples(true)}
                    className="text-xs font-black text-onion-blue flex items-center gap-1 hover:opacity-70 transition-opacity"
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
                        className="absolute top-1 right-1 bg-black/50 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs group-hover:scale-110"
                      >×</button>
                    </div>
                  ))}
                  {images.length < 2 && (
                    <label className="w-20 h-20 bg-sky-50 border-2 border-dashed border-sky-100 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform">
                      <Upload className="w-5 h-5 text-sky-300" />
                      <span className="text-[10px] font-black text-sky-300 uppercase">点击上传截图</span>
                      <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                    </label>
                  )}
                </div>
              </div>

              <button 
                onClick={handleTaskSubmit}
                disabled={isSubmitting || !onionId || images.length === 0}
                className="w-full h-11 bg-gradient-to-r from-onion-blue to-onion-purple text-white rounded-xl font-black text-base shadow-lg shadow-blue-500/10 active:scale-95 flex items-center justify-center gap-2 transition-all disabled:opacity-20 translate-y-1 mb-1"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>立即提交凭证 <Send className="w-5 h-5" /></>}
              </button>
              <p className="text-[11px] text-gray-400 text-center font-bold mt-4">⚠️凭证提交成功后，葱葱将在24小时内完成审核～</p>
            </div>
          </section>
        )}

        {/* 8. Logs */}
        <section className="bg-white rounded-[24px] pt-4 px-4 pb-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50 min-h-[120px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#546bfa] rounded-full flex justify-center items-center text-white shrink-0 shadow-sm relative">
                 <div className="w-2 h-2 border-[2px] border-white rounded-full"></div>
              </div>
              <h3 className="text-[15px] font-extrabold text-[#444d63] tracking-wide">我的分享记录</h3>
            </div>
            {records.length > 2 && (
              <button 
                onClick={() => setShowAllRecords(!showAllRecords)}
                className="text-[12px] font-bold text-[#546bfa] flex items-center gap-0.5 hover:opacity-80 transition-opacity"
              >
                {showAllRecords ? '收起记录' : '查看全部'} <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAllRecords ? '-rotate-90' : ''}`} />
              </button>
            )}
          </div>

          {/* Filters (only show when expanded) */}
          <AnimatePresence>
            {showAllRecords && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 mb-4">
                  {['all', 'pending', 'passed'].map(f => (
                    <button 
                      key={f}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${activeFilter === f ? 'bg-[#546bfa] text-white border-[#546bfa]' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'}`}
                      onClick={() => setActiveFilter(f)}
                    >
                      {f === 'all' ? '全部' : f === 'pending' ? '审核中' : '已通过'}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Records List */}
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {(showAllRecords ? records : records.slice(0, 2))
                .filter(r => activeFilter === 'all' || r.status === activeFilter)
                .map((log, index) => {
                  const isExpanded = expandedRecordIds.includes(log.id);
                  return (
                    <motion.div 
                      layout
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-[#f0f0f4] rounded-[16px] p-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => setExpandedRecordIds(prev => 
                        isExpanded ? prev.filter(id => id !== log.id) : [...prev, log.id]
                      )}
                    >
                      <div className="flex justify-between items-center w-full gap-2">
                        <div className="flex items-center gap-2 shrink-0">
                           {log.status === 'passed' ? <CheckCircle2 className="w-[18px] h-[18px] text-[#22c55e] fill-[#dcfce7] shrink-0" /> :
                            log.status === 'pending' ? <Clock className="w-[18px] h-[18px] text-[#546bfa] fill-[#eef2ff] shrink-0" /> : 
                            <AlertCircle className="w-[18px] h-[18px] text-[#ef4444] fill-[#fee2e2] shrink-0" />}
                           <span className="text-[13px] font-bold text-[#444d63] whitespace-nowrap">第 {records.length - index} 次分享</span>
                        </div>
                        <div className="flex-1 flex justify-center shrink-0">
                           <span className={`px-2 py-[2px] rounded-full text-[10px] font-bold whitespace-nowrap ${
                            log.status === 'pending' ? 'bg-[#eef2ff] text-[#546bfa]' :
                            log.status === 'passed' ? 'bg-[#dcfce7] text-[#22c55e]' :
                            'bg-[#fee2e2] text-[#ef4444]'
                           }`}>
                             {log.status === 'pending' ? '审核中' : log.status === 'passed' ? '已通过' : '未通过'}
                           </span>
                        </div>
                        <div className="flex justify-end shrink-0">
                           <span className="text-[11px] text-[#8e98ac] font-medium whitespace-nowrap">{log.time}</span>
                        </div>
                      </div>

                      {/* Expanded Content: Image and Reason */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden border-t border-gray-50 flex gap-3 pt-3"
                          >
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0 shadow-sm flex items-center justify-center cursor-pointer hover:border-[#546bfa] transition-colors"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (localImageCache[log.time] || log.image) {
                                      setPreviewImage(localImageCache[log.time] || log.image);
                                   }
                                 }}>
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
                                <Upload className="w-4 h-4 text-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                              {log.reason ? (
                                <p className="text-[11px] text-[#ef4444] font-bold leading-snug">未通过原因：{log.reason}</p>
                              ) : (
                                <p className="text-[11px] text-gray-400 font-bold leading-snug">包含 {log.count} 张截图记录<br/>点击左侧图片可放大查看</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
            
            {records.length === 0 && (
              <div className="text-center py-8 opacity-30 grayscale flex flex-col items-center">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center mb-2">
                  <History className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-[12px] font-bold text-gray-500">暂无分享记录</p>
              </div>
            )}
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
              <div className="bg-onion-purple p-5 sm:p-6 pb-8 text-white relative">
                <button 
                  onClick={() => setShowRewardRules(false)}
                  className="absolute right-5 top-5 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-6 bg-white rounded-full"></div>
                  <h3 className="text-xl sm:text-2xl font-black">奖励说明</h3>
                </div>
                <p className="text-xs sm:text-sm opacity-80 leading-relaxed font-bold">
                  本次活动准备了基础、成长和高阶大奖，分享越多，奖励越多！✨
                </p>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6 custom-scrollbar pb-10">
                {/* Section 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black">01</span>
                    <h4 className="text-base font-black text-gray-800">基础奖励：先参与先得</h4>
                  </div>
                  <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                    <p className="text-sm text-gray-600 leading-normal">
                      完成 <span className="text-orange-600 font-bold">首次有效分享</span>，即可领取 <span className="text-orange-600 font-bold">500 洋葱币</span>
                    </p>
                  </div>
                </div>

                {/* Section 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-black">02</span>
                    <h4 className="text-base font-black text-gray-800">成长奖励：阶梯领好礼</h4>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {[
                      { c: 5, r: 800 },
                      { c: 10, r: 1000 },
                      { c: 15, r: 1500 },
                      { c: 20, r: 2000 }
                    ].map((item, i) => (
                      <div key={i} className={`flex justify-between items-center p-3 text-xs sm:text-sm ${i % 2 === 0 ? 'bg-purple-50/30' : ''}`}>
                        <span className="text-gray-500 font-bold shrink-0 mr-2">累计 {item.c} 次有效分享</span>
                        <span className="text-purple-600 font-black whitespace-nowrap">+{item.r} 洋葱币</span>
                      </div>
                    ))}
                    <div className="p-3 bg-gray-50 text-[10px] sm:text-xs text-gray-400 font-bold leading-tight border-t border-gray-100">
                      💡 洋葱币奖励将于达成次数后 24h 内自动发放。
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black">03</span>
                    <h4 className="text-base font-black text-gray-800">终极挑战：高阶特权大奖</h4>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl text-white shadow-lg space-y-4 shadow-purple-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl shrink-0">🧺</div>
                      <div>
                        <p className="text-sm font-black mb-0.5">洋葱星球限定野餐垫</p>
                        <p className="text-xs opacity-70">完成 30 次有效分享即可获得 1 张！</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 border-t border-white/20 pt-3">
                      <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1 shrink-0"></div>
                        <p className="text-xs leading-relaxed"><span className="font-black text-yellow-300">学习类内容：</span>可竞争内容 24h 置顶位（每天每学段 3 席）</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1 shrink-0"></div>
                        <p className="text-xs leading-relaxed"><span className="font-black text-yellow-300">非学习类内容：</span>可竞争一周圈主轮值资格（每周 8 席）</p>
                      </div>
                    </div>

                    <div className="bg-black/10 p-2.5 rounded-xl text-xs leading-relaxed opacity-90">
                      🏆 评选规则：优先按照“累计有效分享次数”排序。若次数相同，则按“最先达成时间”排序，先到先得！
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-2">
                <button 
                  onClick={() => setShowRewardRules(false)}
                  className="w-full h-14 bg-onion-purple text-white rounded-2xl font-black text-base tracking-[0.2em] shadow-xl shadow-purple-500/20 active:scale-[0.98] transition-all"
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
              <div className="bg-gradient-to-br from-onion-blue to-indigo-700 p-5 text-white relative">
                <button 
                  onClick={() => setShowExamples(false)}
                  className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-5 bg-white rounded-full"></div>
                  <h3 className="text-lg font-black tracking-wide">提报凭证指南</h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-8 space-y-8 custom-scrollbar">
                {/* Correct Example */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-black">✓</span>
                      <h4 className="text-base font-black text-gray-800">正确示例</h4>
                    </div>
                    <span className="text-xs font-black text-green-500 bg-green-50 px-2 py-0.5 rounded-full">容易通过</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* 图1 */}
                    <div className="space-y-2">
                      <div 
                        className="relative aspect-[9/16] bg-gray-50 rounded-2xl overflow-hidden border border-green-500/20 group cursor-pointer"
                        onClick={() => setPreviewImage("https://fp.yangcong345.com/shadow/image111-5fc97e9d2cd6855551d016d985dc61c1__w.png")}
                      >
                        <img 
                          src="https://fp.yangcong345.com/shadow/image111-5fc97e9d2cd6855551d016d985dc61c1__w.png" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain bg-white group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-[11px] font-black px-1.5 py-0.5 rounded-full shadow-md scale-90 origin-left">就要这种！</div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex justify-center items-center">
                           <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-sm transition-opacity">点击放大</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 font-black leading-tight text-center px-1">
                        社交平台群聊/私聊分享
                      </p>
                    </div>

                    {/* 图2 */}
                    <div className="space-y-2">
                      <div 
                        className="relative aspect-[9/16] bg-gray-50 rounded-2xl overflow-hidden border border-green-500/20 group cursor-pointer"
                        onClick={() => setPreviewImage("https://fp.yangcong345.com/shadow/image222-880bbbacb5404958338e54a26f8fe9c3__w.png")}
                      >
                        <img 
                          src="https://fp.yangcong345.com/shadow/image222-880bbbacb5404958338e54a26f8fe9c3__w.png" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain bg-white group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-[11px] font-black px-1.5 py-0.5 rounded-full shadow-md scale-90 origin-left">就要这种！</div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex justify-center items-center">
                           <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-sm transition-opacity">点击放大</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 font-black leading-tight text-center px-1">
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

      <footer className="mt-8 text-center pb-6 opacity-30 space-y-1.5">
         <p className="text-[10px] font-bold tracking-widest">活动最终解释权归洋葱学园所有</p>
         <p className="text-xs font-black tracking-[0.4em] uppercase">洋葱学园 · 研究员之家</p>
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
               <h3 className="text-lg font-black text-gray-800 mb-2">{toast.message}</h3>
               <p className="text-xs text-gray-400 font-bold mb-8 text-balance">你提交的分享凭证已记录！葱葱将会在24小时内更新审核状态哦～</p>
               <button 
                 onClick={() => setToast({ ...toast, show: false })}
                 className="w-full h-14 bg-gradient-to-r from-onion-purple to-indigo-600 text-white rounded-2xl font-black text-sm tracking-widest uppercase shadow-lg shadow-purple-500/30 active:scale-95 transition-transform"
               >继续挑战，冲刺大奖🎊</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FAQ Modal --- */}
      <AnimatePresence>
        {showFaq && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md" 
              onClick={() => setShowFaq(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-white/20"
            >
              <div className="bg-gradient-to-br from-onion-blue to-indigo-700 p-5 text-white relative shrink-0">
                <button 
                  onClick={() => setShowFaq(false)}
                  className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-5 bg-white rounded-full"></div>
                  <h3 className="text-lg font-black tracking-wide">活动问题解答</h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-8 space-y-6 custom-scrollbar pb-10">
                {[
                  { 
                    q: "1. 我该怎么参加这个活动？", 
                    a: "你只需要完成 4 步：\n\n1. 选择你喜欢的帖子（自己的也可以！），点击右上角分享至微信/QQ好友、朋友圈或其他社交平台\n2. 分享完成后对分享的页面进行截图（如聊天框或朋友圈内容等），不对截图做任何处理和裁剪，作为有效凭证～\n3. 在本页面\"提交分享凭证\"处输入洋葱 ID 并上传截图，显示提交成功。\n4. 等待审核，审核通过后将次数计入分享进度，并同步更新奖励获得情况。" 
                  },
                  { 
                    q: "2. 为什么我提交了，但分享进度没有变化？", 
                    a: "因为提交成功只代表系统已经记录了你的分享，不代表已经通过审核。\n只有审核通过后，才会计入分享和奖励进度。"
                  },
                  { 
                    q: "3. 为什么我的提交次数和分享进度不一样？", 
                    a: "可能是因为：\n• 有些记录还在审核中\n• 有些记录未通过审核\n• 有些记录被判定为重复或无效\n\n所以页面上的“我的分享进度”才是奖励结算的最终依据。"
                  },
                  { 
                    q: "4. 什么样的分享才会通过审核？", 
                    a: "只有真实、不重复、可核验的分享记录，才会计入有效分享次数。\n如果截图重复、同场景重复提交、信息缺失或无法判断真实性，可能不会被计入。"
                  },
                  { 
                    q: "5. 哪些情况可能会无法通过审核？", 
                    a: "例如：\n• 同一截图重复上传\n• 同一场景重复分享\n• 截图不清晰或关键信息缺失\n• 提交时间超过活动截止时间\n• 存在伪造、拼接、刷量等异常情况"
                  },
                  { 
                    q: "6. 奖励什么时候发放？", 
                    a: "当你的分享进度达到对应门槛后，奖励会按照活动规则发放。\n如果是洋葱币奖励，通常会在审核通过并满足条件后进入发放流程，于24小时内发放完毕。"
                  },
                  { 
                    q: "7. 为什么我达标了，但奖励还没到账？", 
                    a: "可能有以下几种情况：\n• 你的部分记录还在审核中\n• 奖励正在发放中\n• 当前奖励需要统一结算\n• 如果是实物奖励，需要在活动结束后统一通过提及消息收集领奖信息，请耐心等待噢～"
                  },
                  { 
                    q: "8. 高阶奖励怎么获得？", 
                    a: "达到对应分享进度门槛后，你就有机会参与高阶奖励竞争。\n高阶奖励通常会根据累计有效分享次数进行排序；若次数相同，则按最先达成时间排序，名额有限，先到先得。"
                  },
                  { 
                    q: "9. 为什么我已经分享了很多次，还是没拿到高阶奖励？", 
                    a: "高阶奖励属于限量竞争奖励。\n即使你已经达到参与门槛，也需要和其他用户一起按规则排序，所以达到门槛不等于一定获奖。"
                  },
                  { 
                    q: "10. 我提交错了洋葱ID怎么办？", 
                    a: "如果洋葱ID填写错误，可能导致记录无法正确归属。\n建议重新填写新的洋葱ID并提交记录。"
                  },
                  { 
                    q: "11. 活动截止后还能补交吗？", 
                    a: "不能。\n活动结束后将不再接收新的提交记录，也不再补录，请务必在截止时间前完成提交。"
                  },
                  { 
                    q: "12. 活动结果在哪里看？", 
                    a: "你可以在活动页查看自己的记录和奖励进度，也可以留意活动结束后的官方公布结果或站内通知。"
                  }
                ].map((f, i) => (
                  <div key={i} className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                    <p className="text-[14px] font-black text-gray-800 mb-3 leading-snug">
                       {f.q}
                    </p>
                    <div className="text-[13px] text-gray-600 font-medium leading-relaxed">
                      {f.a.split('\n').map((line, idx) => <p key={idx} className="mb-1 last:mb-0">{line}</p>)}
                    </div>
                  </div>
                ))}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button 
              className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"
              onClick={() => setPreviewImage(null)}
            >
              <span className="text-2xl leading-none">&times;</span>
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={previewImage} 
              className="max-w-[70vw] max-h-[70vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
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
