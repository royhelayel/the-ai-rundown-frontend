import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Calendar, Clock, Mail, Plus, Trash2, LogOut, User, Search, Sparkles, Settings, Loader, Menu, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { VerificationPage } from './components/VerificationPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const TheAIRundown = () => {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('World News');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState({
    night: false, morning: false, noon: false, afternoon: false, evening: false
  });
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSummary, setNewsSummary] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [newsNotAvailable, setNewsNotAvailable] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  const categoryScrollRef = useRef(null);
  const dayScrollRef = useRef(null);
  const timeScrollRef = useRef(null);
  const pollTimerRef = useRef(null);

  const [showCategoryLeftArrow, setShowCategoryLeftArrow] = useState(false);
  const [showCategoryRightArrow, setShowCategoryRightArrow] = useState(true);
  const [showDayLeftArrow, setShowDayLeftArrow] = useState(false);
  const [showDayRightArrow, setShowDayRightArrow] = useState(true);

  const defaultCategories = ['World News','Technology','Business','Politics','Sports','Entertainment','Science','Health'];

  const timesOfDay = [
    { value: 'Night',     label: 'Night',     time: '12 AM – 6 AM' },
    { value: 'Morning',   label: 'Morning',   time: '6 AM – 10 AM' },
    { value: 'Noon',      label: 'Noon',      time: '10 AM – 2 PM' },
    { value: 'Afternoon', label: 'Afternoon', time: '2 PM – 6 PM' },
    { value: 'Evening',   label: 'Evening',   time: '6 PM – 12 AM' },
  ];

  function getDaysOfWeek(offset = 0) {
    const days = [];
    const base = offset * 7;
    for (let i = base - 6; i <= base; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const uaeDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
      const fullDate = uaeDate.toISOString().split('T')[0];
      const dayName = uaeDate.toLocaleDateString('en-US', { weekday: 'short' });
      const dateNum = uaeDate.getDate();
      days.push({ label: dayName, date: dateNum, fullDate });
    }
    return days;
  }

  const daysOfWeek = getDaysOfWeek(weekOffset);
  const allCategories = [...defaultCategories, ...customCategories];

  const getCurrentTimeSlot = () => {
    const now = new Date();
    const uaeTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
    const hour = uaeTime.getHours();
    if (hour >= 6 && hour < 10) return 'Morning';
    if (hour >= 10 && hour < 14) return 'Noon';
    if (hour >= 14 && hour < 18) return 'Afternoon';
    return 'Evening';
  };

  const currentTimeSlot = getCurrentTimeSlot();
  const currentTimeIndex = timesOfDay.findIndex(t => t.value === currentTimeSlot);
  const today = daysOfWeek[daysOfWeek.length - 1]?.fullDate;

  const isCustomCategory = customCategories.includes(selectedCategory);
  const availableTimes = isCustomCategory ? timesOfDay.slice(currentTimeIndex) : timesOfDay;
  const availableDays  = isCustomCategory ? daysOfWeek.filter(d => d.fullDate === today) : daysOfWeek;

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    if (customCategories.includes(category)) {
      setSelectedDay(today);
      setSelectedTime(currentTimeSlot);
    }
  };

  useEffect(() => {
    setSelectedDay(getDaysOfWeek(0)[6].fullDate);
    const now = new Date();
    const uaeTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
    const hour = uaeTime.getHours();
    let defaultTime = 'Evening';
    if (hour >= 6 && hour < 10)  defaultTime = 'Morning';
    else if (hour >= 10 && hour < 14) defaultTime = 'Noon';
    else if (hour >= 14 && hour < 18) defaultTime = 'Afternoon';
    else if (hour >= 18 && hour < 24) defaultTime = 'Evening';
    setSelectedTime(defaultTime);
    try {
      const savedUser = localStorage.getItem('newsdigest_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setEmailPreferences(userData.emailPreferences || { night: false, morning: false, noon: false, afternoon: false, evening: false });
        // Refresh categories and email preferences from Supabase
        Promise.all([
          supabase.from('custom_categories').select('category_name').eq('user_id', userData.id),
          supabase.from('users').select('email_preferences').eq('id', userData.id).single()
        ]).then(([catRes, prefRes]) => {
          const cats = catRes.data?.map(c => c.category_name) || [];
          const prefs = prefRes.data?.email_preferences || userData.emailPreferences || { night: false, morning: false, noon: false, afternoon: false, evening: false };
          setCustomCategories(cats);
          setEmailPreferences(prefs);
          const updated = { ...userData, categories: cats, emailPreferences: prefs };
          localStorage.setItem('newsdigest_user', JSON.stringify(updated));
          setUser(updated);
        });
      }
    } catch (error) { console.error('Init error:', error); }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) setShowMobileMenu(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const categoryRef = categoryScrollRef.current;
    const dayRef = dayScrollRef.current;
    const handleCategoryScroll = () => checkScrollPosition(categoryScrollRef, setShowCategoryLeftArrow, setShowCategoryRightArrow);
    const handleDayScroll = () => checkScrollPosition(dayScrollRef, setShowDayLeftArrow, setShowDayRightArrow);
    if (categoryRef) categoryRef.addEventListener('scroll', handleCategoryScroll);
    if (dayRef) dayRef.addEventListener('scroll', handleDayScroll);
    handleCategoryScroll(); handleDayScroll();
    const t = setTimeout(() => { handleCategoryScroll(); handleDayScroll(); }, 100);
    return () => {
      if (categoryRef) categoryRef.removeEventListener('scroll', handleCategoryScroll);
      if (dayRef) dayRef.removeEventListener('scroll', handleDayScroll);
      clearTimeout(t);
    };
  }, [customCategories, daysOfWeek]);

  const handleFetchNews = async () => {
    if (!selectedCategory || !selectedDay || !selectedTime) return;
    if (newsSummary && newsSummary.category === selectedCategory && newsSummary.day === selectedDay && newsSummary.time_slot === selectedTime) return;
    setNewsLoading(true);
    setNewsNotAvailable(false);
    try {
      const { data, error } = await supabase.from('news_summaries').select('*')
        .eq('category', selectedCategory).eq('day', selectedDay).eq('time_slot', selectedTime).maybeSingle();
      if (error) throw error;
      if (!data) { setNewsNotAvailable(true); setNewsSummary(null); return; }
      setNewsSummary(data); setNewsNotAvailable(false);
      if (user) {
        fetch(`${BACKEND_URL}/api/metrics/track`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, eventType: 'news_view', category: selectedCategory, day: selectedDay, time: selectedTime })
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsNotAvailable(true); setNewsSummary(null);
    } finally { setNewsLoading(false); }
  };

  const handleGenerateCustomCategory = async () => {
    if (!customCategories.includes(selectedCategory)) return;
    // Cancel any in-flight poll from a previous attempt
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
    try {
      setNewsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/generate/custom-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, category: selectedCategory, day: selectedDay, timeSlot: selectedTime })
      });
      if (!response.ok) { setNewsLoading(false); return; }
      const category = selectedCategory, day = selectedDay, time = selectedTime;
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const { data } = await supabase.from('news_summaries').select('*')
          .eq('category', category).eq('day', day).eq('time_slot', time).maybeSingle();
        if (data) { setNewsSummary(data); setNewsNotAvailable(false); setNewsLoading(false); pollTimerRef.current = null; }
        else if (attempts < 36) { pollTimerRef.current = setTimeout(poll, 5000); }
        else { setNewsLoading(false); setNewsNotAvailable(true); pollTimerRef.current = null; }
      };
      pollTimerRef.current = setTimeout(poll, 5000);
    } catch (error) { console.error('Error generating:', error); setNewsLoading(false); }
  };

  useEffect(() => {
    if (isCustomCategory && selectedTime && !availableTimes.find(t => t.value === selectedTime))
      setSelectedTime(currentTimeSlot);
  }, [isCustomCategory, availableTimes, selectedTime, currentTimeSlot]);

  useEffect(() => {
    if (selectedCategory && selectedDay && selectedTime) handleFetchNews();
  }, [selectedCategory, selectedDay, selectedTime]);

  useEffect(() => {
    if (newsNotAvailable && customCategories.includes(selectedCategory) && user) handleGenerateCustomCategory();
  }, [newsNotAvailable, selectedCategory]);

  const handleAuth = async () => {
    if (!email || !password) return;
    if (authMode === 'signup') {
      try {
        setShowAuth(false);
        const res = await fetch(`${BACKEND_URL}/api/auth/send-verification`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) { const e = await res.json(); alert('Failed to sign up: ' + e.error); setShowAuth(true); return; }
        alert(`Verification email sent to ${email}! Please check your email.`);
        setEmail(''); setPassword(''); setAuthMode('signin');
      } catch (error) { alert('Error during sign-up: ' + error.message); setShowAuth(true); }
    } else {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) { alert('Failed to sign in: ' + authError.message); return; }
        if (!authData.user) { alert('Sign-in failed. Please try again.'); return; }
        const { data: userProfile, error: profileError } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
        if (profileError) { alert('Failed to load user profile'); return; }
        if (userProfile.verification_status !== 'verified') { alert('Please verify your email first.'); return; }
        const { data: categoriesData } = await supabase.from('custom_categories').select('category_name').eq('user_id', authData.user.id);
        const categories = categoriesData?.map(c => c.category_name) || [];
        const userData = {
          id: authData.user.id,
          email: authData.user.email,
          categories,
          emailPreferences: userProfile.email_preferences || { night: false, morning: false, noon: false, afternoon: false, evening: false }
        };
        localStorage.setItem('newsdigest_user', JSON.stringify(userData));
        setUser(userData); setCustomCategories(categories); setEmailPreferences(userData.emailPreferences || {});
        setShowAuth(false); setShowMobileMenu(false); setEmail(''); setPassword('');
      } catch (error) { alert('Error during sign-in: ' + error.message); }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !user) return;
    const { error } = await supabase.from('custom_categories').insert({ user_id: user.id, category_name: newCategory.trim() });
    if (error) { alert('Failed to add category: ' + error.message); return; }
    const updated = { ...user, categories: [...(user.categories || []), newCategory.trim()] };
    localStorage.setItem('newsdigest_user', JSON.stringify(updated));
    setUser(updated); setCustomCategories(updated.categories); setNewCategory(''); setShowCategoryModal(false);
  };

  const handleDeleteCategory = async (categoryToDelete) => {
    const { error } = await supabase.from('custom_categories').delete().eq('user_id', user.id).eq('category_name', categoryToDelete);
    if (error) { console.error('Error deleting category:', error); return; }
    const updated = { ...user, categories: user.categories.filter(cat => cat !== categoryToDelete) };
    localStorage.setItem('newsdigest_user', JSON.stringify(updated));
    setUser(updated); setCustomCategories(updated.categories);
    if (selectedCategory === categoryToDelete) setSelectedCategory('World News');
  };

  const handleEmailPreferenceToggle = async (timeValue) => {
    const updated = { ...emailPreferences, [timeValue]: !emailPreferences[timeValue] };
    setEmailPreferences(updated);
    if (user) {
      const userData = { ...user, emailPreferences: updated };
      localStorage.setItem('newsdigest_user', JSON.stringify(userData));
      setUser(userData);
      // Persist to backend (uses service role to bypass RLS)
      fetch(`${BACKEND_URL}/api/user/email-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, preferences: updated })
      }).catch(err => console.error('Failed to save email preferences:', err));
    }
  };

  const checkScrollPosition = (ref, setLeftArrow, setRightArrow) => {
    if (ref.current) {
      setLeftArrow(ref.current.scrollLeft > 0);
      setRightArrow(ref.current.scrollLeft < ref.current.scrollWidth - ref.current.clientWidth - 10);
    }
  };

  const isMobile = windowWidth < 768;

  /* ── Shared pill styles (inspired by attached image) ── */
  const dayPill = (active) => ({
    padding: '0.45rem 1rem',
    background: active ? '#111827' : 'white',
    color: active ? 'white' : '#374151',
    border: active ? 'none' : '1.5px solid #e5e7eb',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: active ? '700' : '500',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    lineHeight: 1.4,
  });

  const timePill = (active) => ({
    padding: '0.3rem 0.9rem',
    background: active ? 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)' : 'white',
    color: active ? 'white' : '#6b7280',
    border: active ? 'none' : '1.5px solid #e5e7eb',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: active ? '700' : '500',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  });

  const navArrow = (disabled) => ({
    padding: '0.3rem 0.5rem',
    background: 'none',
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? '#d1d5db' : '#9ca3af',
    flexShrink: 0,
    fontSize: '1rem',
    lineHeight: 1,
    userSelect: 'none',
  });

  /* ── Slide-out panel shared wrapper ── */
  const slidePanel = (children) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '270px', background: 'white', boxShadow: '4px 0 24px rgba(0,0,0,0.12)', zIndex: 1000, overflowY: 'auto', animation: 'slideIn 0.22s ease' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)', minHeight: '100vh', overflowY: 'scroll', overflowX: 'hidden' }}>
      <style>{`
        html { overflow-y: scroll; }
        body { overflow-y: scroll; }
        * { box-sizing: border-box; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: 'white', boxShadow: '0 1px 0 rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Brand row */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: '1rem' }}>
          <div onClick={() => setCurrentView('home')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, cursor: 'pointer' }}>
            <Sparkles size={28} color="#6366f1" />
            <h1 style={{ fontSize: '1.7rem', fontWeight: '900', margin: 0, background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              The AI Rundown
            </h1>
          </div>

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
              {user && (
                <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.55rem 1.1rem', background: 'rgba(99,102,241,0.08)', border: '1.5px solid #6366f1', borderRadius: '999px', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '700' }}>
                  <Plus size={15} /> Add Category
                </button>
              )}
              {user ? (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ padding: '0.5rem 0.95rem', background: 'rgba(99,102,241,0.06)', border: 'none', borderRadius: '999px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '600', color: '#6366f1' }}>
                    <User size={15} /> {user.email}
                  </button>
                  {showUserMenu && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid #f0f0f0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: '0.5rem', zIndex: 1000, minWidth: '160px', overflow: 'hidden' }}>
                      <button onClick={() => { setCurrentView('settings'); setShowUserMenu(false); }} style={{ width: '100%', padding: '0.7rem 1.1rem', background: 'none', border: 'none', borderBottom: '1px solid #f5f5f5', textAlign: 'left', cursor: 'pointer', fontSize: '0.88rem', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Settings size={14} /> Settings
                      </button>
                      <button onClick={async () => { await supabase.auth.signOut(); setUser(null); localStorage.removeItem('newsdigest_user'); setShowUserMenu(false); setCurrentView('home'); }} style={{ width: '100%', padding: '0.7rem 1.1rem', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.88rem', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => { setShowAuth(true); setAuthMode('signin'); }} style={{ padding: '0.55rem 1.3rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>
                  Sign In
                </button>
              )}
            </div>
          )}

          {isMobile && (
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1' }}>
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        {/* Category nav */}
        {windowWidth > 1100 && (
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
              <div ref={categoryScrollRef} style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {allCategories.map(category => (
                  <button key={category} onClick={() => handleSelectCategory(category)} style={{ padding: '0.65rem 1.1rem', background: 'none', border: 'none', borderBottom: selectedCategory === category ? '2.5px solid #6366f1' : '2.5px solid transparent', color: selectedCategory === category ? '#111827' : '#6b7280', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '500', fontSize: '0.88rem', whiteSpace: 'nowrap', transition: 'all 0.15s ease', letterSpacing: '-0.01em' }}>
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {isMobile && showMobileMenu && (
          <div style={{ background: 'white', borderTop: '1px solid #f3f4f6', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {user && (
              <>
                <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.6rem 1rem', background: 'rgba(99,102,241,0.08)', border: '1.5px solid #6366f1', borderRadius: '999px', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '700' }}>
                  <Plus size={14} /> Add Custom Category
                </button>
                <button onClick={() => { setCurrentView('settings'); setShowMobileMenu(false); }} style={{ padding: '0.6rem 1rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: '999px', cursor: 'pointer', fontSize: '0.88rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Settings size={14} /> Settings
                </button>
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); localStorage.removeItem('newsdigest_user'); setShowMobileMenu(false); setCurrentView('home'); }} style={{ padding: '0.6rem 1rem', background: 'none', border: '1px solid #fee2e2', borderRadius: '999px', cursor: 'pointer', fontSize: '0.88rem', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </>
            )}
            {!user && (
              <button onClick={() => { setShowAuth(true); setAuthMode('signin'); setShowMobileMenu(false); }} style={{ padding: '0.6rem 1.3rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>
                Sign In
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── Auth Modal ── */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', maxWidth: '380px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem', textAlign: 'center', color: '#111827' }}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '0.7rem', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.93rem', outline: 'none' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '1.2rem', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.93rem', outline: 'none' }} />
            <button onClick={handleAuth} style={{ width: '100%', padding: '0.82rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.6rem' }}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} style={{ width: '100%', padding: '0.78rem', background: 'none', border: '1.5px solid #e5e7eb', color: '#374151', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.6rem' }}>
              {authMode === 'signin' ? 'Create Account Instead' : 'Sign In Instead'}
            </button>
            <button onClick={() => { setShowAuth(false); setEmail(''); setPassword(''); }} style={{ width: '100%', padding: '0.7rem', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.88rem' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Add Category Modal ── */}
      {showCategoryModal && user && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', maxWidth: '380px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '1.2rem', color: '#111827' }}>Add Custom Category</h2>
            <input type="text" placeholder="e.g., Los Angeles Lakers" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '1.2rem', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.93rem' }} />
            <button onClick={handleAddCategory} style={{ width: '100%', padding: '0.82rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.6rem' }}>
              Add Category
            </button>
            <button onClick={() => setShowCategoryModal(false)} style={{ width: '100%', padding: '0.78rem', background: 'none', border: '1.5px solid #e5e7eb', color: '#374151', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      {currentView === 'home' && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 2rem 3rem 2rem' }}>

          {/* Mobile trigger buttons */}
          <div style={{ marginBottom: '0.6rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {windowWidth <= 1100 && (
              <button onClick={() => setShowCategoryMenu(!showCategoryMenu)} style={{ padding: '0.42rem 0.9rem', background: 'rgba(99,102,241,0.08)', border: '1.5px solid #6366f1', borderRadius: '999px', color: '#6366f1', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                ☰ {selectedCategory}
              </button>
            )}
            {windowWidth <= 900 && (
              <button onClick={() => setShowDayMenu(!showDayMenu)} style={{ padding: '0.42rem 0.9rem', background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '999px', color: '#374151', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                📅 {availableDays.find(d => d.fullDate === selectedDay)?.label || 'Days'}
              </button>
            )}
            {windowWidth <= 750 && (
              <button onClick={() => setShowTimeMenu(!showTimeMenu)} style={{ padding: '0.42rem 0.9rem', background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '999px', color: '#374151', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                🕐 {availableTimes.find(t => t.value === selectedTime)?.label || 'Times'}
              </button>
            )}
          </div>

          {/* Day navigation — standard categories */}
          {windowWidth > 900 && !isCustomCategory && (
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'white', padding: '0.55rem 0.75rem', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <button onClick={() => { const n = weekOffset - 1; setWeekOffset(n); setSelectedDay(getDaysOfWeek(n)[6].fullDate); }} disabled={weekOffset <= -3} style={navArrow(weekOffset <= -3)}>‹</button>
              <div ref={dayScrollRef} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {availableDays.map(day => (
                  <button key={day.fullDate} onClick={() => setSelectedDay(day.fullDate)} style={dayPill(selectedDay === day.fullDate)}>
                    {day.label} {day.date}
                  </button>
                ))}
              </div>
              <button onClick={() => { const n = weekOffset + 1; setWeekOffset(n); setSelectedDay(getDaysOfWeek(n)[6].fullDate); }} disabled={weekOffset >= 0} style={navArrow(weekOffset >= 0)}>›</button>
            </div>
          )}

          {/* Day + time row — custom categories */}
          {windowWidth > 750 && isCustomCategory && (
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', background: 'white', padding: '0.55rem 0.75rem', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {availableDays.map(day => (
                <button key={day.fullDate} onClick={() => setSelectedDay(day.fullDate)} style={dayPill(selectedDay === day.fullDate)}>
                  {day.label} {day.date}
                </button>
              ))}
              <span style={{ color: '#e5e7eb', margin: '0 0.1rem', userSelect: 'none' }}>|</span>
              {availableTimes.map(time => (
                <button key={time.value} onClick={() => setSelectedTime(time.value)} style={timePill(selectedTime === time.value)}>
                  {time.label}
                </button>
              ))}
            </div>
          )}

          {/* Slide-out: categories */}
          {showCategoryMenu && windowWidth <= 1100 && slidePanel(
            <div style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#111827' }}>Categories</h3>
                <button onClick={() => setShowCategoryMenu(false)} style={{ padding: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.2rem' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {allCategories.map(category => (
                  <button key={category} onClick={() => { handleSelectCategory(category); setShowCategoryMenu(false); }} style={{ padding: '0.62rem 0.9rem', background: selectedCategory === category ? 'rgba(99,102,241,0.08)' : 'transparent', color: selectedCategory === category ? '#6366f1' : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slide-out: days */}
          {showDayMenu && windowWidth <= 900 && slidePanel(
            <div style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#111827' }}>Days</h3>
                <button onClick={() => setShowDayMenu(false)} style={{ padding: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.2rem' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {availableDays.map(day => (
                  <button key={day.fullDate} onClick={() => { setSelectedDay(day.fullDate); setShowDayMenu(false); }} style={{ padding: '0.62rem 0.9rem', background: selectedDay === day.fullDate ? '#111827' : 'transparent', color: selectedDay === day.fullDate ? 'white' : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: selectedDay === day.fullDate ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                    {day.label} {day.date}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slide-out: times */}
          {showTimeMenu && windowWidth <= 750 && slidePanel(
            <div style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#111827' }}>Times</h3>
                <button onClick={() => setShowTimeMenu(false)} style={{ padding: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.2rem' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {availableTimes.map(time => (
                  <button key={time.value} onClick={() => { setSelectedTime(time.value); setShowTimeMenu(false); }} style={{ padding: '0.62rem 0.9rem', background: selectedTime === time.value ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent', color: selectedTime === time.value ? 'white' : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: selectedTime === time.value ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                    {time.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── News Card ── */}
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minHeight: '500px' }}>

            {/* Time selector — top-left inside card */}
            {windowWidth > 750 && !isCustomCategory && (
              <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {availableTimes.map(time => (
                  <button key={time.value} onClick={() => setSelectedTime(time.value)} style={timePill(selectedTime === time.value)}>
                    {time.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding: '1.75rem 2rem' }}>
              {newsLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <div style={{ display: 'inline-block', animation: 'spin 2s linear infinite' }}>
                    <Loader size={48} color="#6366f1" strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '1.5rem 0 0.4rem', color: '#111827' }}>
                    {customCategories.includes(selectedCategory) ? 'Generating Custom News' : 'Loading Your News'}
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                    {customCategories.includes(selectedCategory) ? 'Searching the web and compiling…' : 'Retrieving pre-generated news…'}
                  </p>
                </div>
              ) : newsNotAvailable ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <Clock size={40} color="#e5e7eb" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.4rem', color: '#374151' }}>News Not Yet Available</h3>
                  <p style={{ fontSize: '0.88rem', color: '#9ca3af', margin: 0 }}>This summary hasn't been generated yet.</p>
                </div>
              ) : newsSummary ? (
                <div>
                  <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '0.9rem', marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '900', margin: '0 0 0.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                      {newsSummary.category}
                    </h2>
                    <div style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#9ca3af' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={11} />
                        <span>{(() => { const d = daysOfWeek.find(d => d.fullDate === newsSummary.day); return d ? `${d.label}, ${d.date}` : newsSummary.day; })()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={11} />
                        <span>{newsSummary.time_slot}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Sparkles size={11} />
                        <span>{new Date(newsSummary.generated_at).toLocaleString('en-US', { timeZone: 'Asia/Dubai' })}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#1e293b', whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: newsSummary.content
                      .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;color:#111827;">$1</strong>')
                      .replace(/^(#{1,3})\s+(.+)$/gm, (_, hashes, text) => {
                        const level = hashes.length;
                        const sizes = { 1: '1.3rem', 2: '1.12rem', 3: '1.02rem' };
                        return `<h${level+2} style="font-size:${sizes[level]};font-weight:800;color:#111827;margin:1rem 0 0.3rem;line-height:1.25;">${text}</h${level+2}>`;
                      })
                      .replace(/^- (.+)$/gm, '<div style="margin:0.25rem 0 0.25rem 1rem;padding-left:0.65rem;border-left:2px solid #e5e7eb;color:#374151;">$1</div>')
                      .replace(/\n\n/g, '<div style="height:0.35rem;"></div>')
                    }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <Sparkles size={40} color="#e5e7eb" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.4rem', color: '#374151' }}>Select your preferences above</h3>
                  <p style={{ fontSize: '0.88rem', color: '#9ca3af', margin: 0 }}>Your personalized news digest will appear here</p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ── Settings View ── */}
      {currentView === 'settings' && user && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #1a1a2e 0%, #64748b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Settings & Preferences
          </h2>
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.1rem' }}>
                <Mail size={20} color="#6366f1" strokeWidth={2.5} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>Email Digest Preferences</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.65rem' }}>
                {timesOfDay.map(time => (
                  <label key={time.value} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.9rem 1rem', background: emailPreferences[time.value.toLowerCase()] ? 'rgba(99,102,241,0.06)' : 'rgba(0,0,0,0.02)', border: emailPreferences[time.value.toLowerCase()] ? '1.5px solid #6366f1' : '1.5px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={emailPreferences[time.value.toLowerCase()] || false} onChange={() => handleEmailPreferenceToggle(time.value.toLowerCase())} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#6366f1' }} />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#111827' }}>{time.label}</div>
                      <div style={{ fontSize: '0.77rem', color: '#9ca3af' }}>{time.time}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Search size={20} color="#ec4899" strokeWidth={2.5} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>Your Custom Categories</h3>
                </div>
                <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.48rem 1rem', background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.3)', borderRadius: '999px', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.83rem', fontWeight: '700' }}>
                  <Plus size={14} /> Add Category
                </button>
              </div>
              {customCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.25rem', color: '#9ca3af' }}>
                  <p style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>No custom categories yet</p>
                  <p style={{ fontSize: '0.83rem' }}>Create your first personalized news category</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  {customCategories.map(category => (
                    <div key={category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.9rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                      <span style={{ fontWeight: '600', color: '#111827', fontSize: '0.88rem' }}>{category}</span>
                      <button onClick={() => handleDeleteCategory(category)} style={{ padding: '0.3rem 0.45rem', background: 'rgba(231,76,60,0.08)', border: 'none', borderRadius: '6px', color: '#e74c3c', cursor: 'pointer' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setCurrentView('home')} style={{ marginTop: '1.4rem', padding: '0.55rem 1.2rem', background: 'rgba(99,102,241,0.08)', border: '1.5px solid #6366f1', borderRadius: '999px', color: '#6366f1', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
            ← Back to News
          </button>
        </main>
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TheAIRundown />} />
        <Route path="/verify-email" element={<VerificationPage />} />
      </Routes>
    </Router>
  );
}

export default App;
