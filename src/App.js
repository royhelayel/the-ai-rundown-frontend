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
  const [customCategoryDescriptions, setCustomCategoryDescriptions] = useState({});
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState({
    categories: [],
    night: false, morning: false, noon: false, afternoon: false, evening: false,
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
  const progressIntervalRef = useRef(null);
  const [generationProgress, setGenerationProgress] = useState(0);

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
    if (hour < 6)  return 'Night';
    if (hour < 10) return 'Morning';
    if (hour < 14) return 'Noon';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  const currentTimeSlot = getCurrentTimeSlot();
  const currentTimeIndex = timesOfDay.findIndex(t => t.value === currentTimeSlot);
  const today = daysOfWeek[daysOfWeek.length - 1]?.fullDate;

  const isCustomCategory = customCategories.includes(selectedCategory);

  // Last completed slot = the one just before the current one (for pre-defined default)
  const lastCompletedTimeSlot = currentTimeIndex > 0
    ? timesOfDay[currentTimeIndex - 1].value
    : timesOfDay[timesOfDay.length - 1].value;

  // Pre-defined: disable current + future (news generated at end of slot, not during)
  // Custom: disable only future (current slot is generatable on demand)
  const isTimeFuture = (timeValue) => {
    if (selectedDay !== today) return false;
    const idx = timesOfDay.findIndex(t => t.value === timeValue);
    if (isCustomCategory) return idx > currentTimeIndex;
    // When Night is current (index 0), all other slots are from the previous cycle — not future
    if (currentTimeIndex === 0) return timeValue === 'Night';
    return idx >= currentTimeIndex;
  };

  // Always show all slots; isTimeFuture handles which are disabled
  const availableTimes = timesOfDay;
  const availableDays  = isCustomCategory ? daysOfWeek.filter(d => d.fullDate === today) : daysOfWeek;

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setSelectedDay(today);
    setSelectedTime(customCategories.includes(category) ? currentTimeSlot : lastCompletedTimeSlot);
  };

  useEffect(() => {
    setSelectedDay(getDaysOfWeek(0)[6].fullDate);
    setSelectedTime(lastCompletedTimeSlot);
    try {
      const savedUser = localStorage.getItem('newsdigest_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setEmailPreferences(normalizeEmailPrefs(userData.emailPreferences || {}));
        // Refresh categories and email preferences from Supabase
        Promise.all([
          supabase.from('custom_categories').select('category_name, category_description').eq('user_id', userData.id),
          supabase.from('users').select('email_preferences').eq('id', userData.id).single()
        ]).then(([catRes, prefRes]) => {
          const cats = catRes.data?.map(c => c.category_name) || [];
          const descs = Object.fromEntries((catRes.data || []).map(c => [c.category_name, c.category_description || c.category_name]));
          const rawPrefs = prefRes.data?.email_preferences || userData.emailPreferences || {};
          const prefs = normalizeEmailPrefs(rawPrefs);
          setCustomCategories(cats);
          setCustomCategoryDescriptions(descs);
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

  const startProgressBar = () => {
    setGenerationProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    // Advance to ~88% over 15 seconds, then hold until poll completes
    let pct = 0;
    progressIntervalRef.current = setInterval(() => {
      pct += (88 - pct) * 0.07;
      setGenerationProgress(Math.min(pct, 88));
    }, 400);
  };

  const finishProgressBar = (cb) => {
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
    setGenerationProgress(100);
    setTimeout(() => { setGenerationProgress(0); cb(); }, 400);
  };

  const handleGenerateCustomCategory = async () => {
    if (!customCategories.includes(selectedCategory)) return;
    if (selectedTime !== currentTimeSlot || selectedDay !== today) return;
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
    try {
      setNewsLoading(true);
      startProgressBar();
      const response = await fetch(`${BACKEND_URL}/api/generate/custom-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, category: selectedCategory, description: customCategoryDescriptions[selectedCategory] || selectedCategory, day: selectedDay, timeSlot: selectedTime })
      });
      if (!response.ok) { finishProgressBar(() => setNewsLoading(false)); return; }
      const category = selectedCategory, day = selectedDay, time = selectedTime;
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const { data } = await supabase.from('news_summaries').select('*')
          .eq('category', category).eq('day', day).eq('time_slot', time).maybeSingle();
        if (data) {
          finishProgressBar(() => { setNewsSummary(data); setNewsNotAvailable(false); setNewsLoading(false); });
          pollTimerRef.current = null;
        } else if (attempts < 36) { pollTimerRef.current = setTimeout(poll, 5000); }
        else { finishProgressBar(() => { setNewsLoading(false); setNewsNotAvailable(true); }); pollTimerRef.current = null; }
      };
      pollTimerRef.current = setTimeout(poll, 5000);
    } catch (error) { console.error('Error generating:', error); finishProgressBar(() => setNewsLoading(false)); }
  };

  useEffect(() => {
    if (!selectedTime) return;
    if (isTimeFuture(selectedTime))
      setSelectedTime(isCustomCategory ? currentTimeSlot : lastCompletedTimeSlot);
  }, [isCustomCategory, selectedDay, selectedTime]);

  useEffect(() => {
    if (selectedCategory && selectedDay && selectedTime) handleFetchNews();
  }, [selectedCategory, selectedDay, selectedTime]);

  useEffect(() => {
    const isCurrentSlot = selectedTime === currentTimeSlot && selectedDay === today;
    if (newsNotAvailable && customCategories.includes(selectedCategory) && user && isCurrentSlot)
      handleGenerateCustomCategory();
  }, [newsNotAvailable, selectedCategory, selectedTime, selectedDay]);

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
        const { data: categoriesData } = await supabase.from('custom_categories').select('category_name, category_description').eq('user_id', authData.user.id);
        const categories = categoriesData?.map(c => c.category_name) || [];
        const descriptions = Object.fromEntries((categoriesData || []).map(c => [c.category_name, c.category_description || c.category_name]));
        const userData = {
          id: authData.user.id,
          email: authData.user.email,
          categories,
          emailPreferences: normalizeEmailPrefs(userProfile.email_preferences || {})
        };
        localStorage.setItem('newsdigest_user', JSON.stringify(userData));
        setUser(userData); setCustomCategories(categories); setCustomCategoryDescriptions(descriptions); setEmailPreferences(userData.emailPreferences);
        setShowAuth(false); setShowMobileMenu(false); setEmail(''); setPassword('');
      } catch (error) { alert('Error during sign-in: ' + error.message); }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !user) return;
    const title = newCategory.trim().slice(0, 25);
    const description = newCategoryDescription.trim() || title;
    const { error } = await supabase.from('custom_categories').insert({ user_id: user.id, category_name: title, category_description: description });
    if (error) { alert('Failed to add category: ' + error.message); return; }
    const updated = { ...user, categories: [...(user.categories || []), title] };
    localStorage.setItem('newsdigest_user', JSON.stringify(updated));
    setUser(updated);
    setCustomCategories(updated.categories);
    setCustomCategoryDescriptions(prev => ({ ...prev, [title]: description }));
    setNewCategory('');
    setNewCategoryDescription('');
    setShowCategoryModal(false);
  };

  const handleDeleteCategory = async (categoryToDelete) => {
    const { error } = await supabase.from('custom_categories').delete().eq('user_id', user.id).eq('category_name', categoryToDelete);
    if (error) { console.error('Error deleting category:', error); return; }
    const updated = { ...user, categories: user.categories.filter(cat => cat !== categoryToDelete) };
    localStorage.setItem('newsdigest_user', JSON.stringify(updated));
    setUser(updated); setCustomCategories(updated.categories);
    if (selectedCategory === categoryToDelete) setSelectedCategory('World News');
  };

  const normalizeEmailPrefs = (raw) => {
    const slots = ['night', 'morning', 'noon', 'afternoon', 'evening'];
    const out = {};
    // Categories: new flat format has raw.categories array; old per-slot format had categories inside each slot
    if (Array.isArray(raw.categories) && raw.categories.length) {
      out.categories = raw.categories;
    } else {
      const firstSlotWithCats = slots.find(s => raw[s]?.categories?.length);
      out.categories = firstSlotWithCats ? raw[firstSlotWithCats].categories : [...defaultCategories];
    }
    // Slot enabled flags
    slots.forEach(slot => {
      const pref = raw[slot];
      if (typeof pref === 'boolean') out[slot] = pref;
      else if (pref && typeof pref === 'object') out[slot] = pref.enabled || false;
      else out[slot] = false;
    });
    return out;
  };

  const saveEmailPrefs = (updated) => {
    setEmailPreferences(updated);
    if (user) {
      const userData = { ...user, emailPreferences: updated };
      localStorage.setItem('newsdigest_user', JSON.stringify(userData));
      setUser(userData);
      fetch(`${BACKEND_URL}/api/user/email-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, preferences: updated })
      }).catch(err => console.error('Failed to save email preferences:', err));
    }
  };

  const handleEmailSlotToggle = (slotKey) => {
    saveEmailPrefs({ ...emailPreferences, [slotKey]: !emailPreferences[slotKey] });
  };

  const handleCategoryEmailToggle = (category) => {
    const cats = emailPreferences.categories || [];
    if (cats.includes(category) && cats.length === 1) return; // must keep at least one
    const newCats = cats.includes(category) ? cats.filter(c => c !== category) : [...cats, category];
    saveEmailPrefs({ ...emailPreferences, categories: newCats });
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

  const timePill = (active, disabled = false) => ({
    padding: '0.3rem 0.9rem',
    background: active ? 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)' : 'white',
    color: active ? 'white' : disabled ? '#d1d5db' : '#6b7280',
    border: active ? 'none' : `1.5px solid ${disabled ? '#f3f4f6' : '#e5e7eb'}`,
    borderRadius: '999px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.78rem',
    fontWeight: active ? '700' : '500',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    opacity: disabled ? 0.45 : 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1.2,
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
              The Rundown
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
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 0.5rem', display: 'flex', alignItems: 'stretch' }}>
              {showCategoryLeftArrow && (
                <button onClick={() => { categoryScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' }); }} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 0.4rem', fontSize: '1.1rem' }}>‹</button>
              )}
              <div ref={categoryScrollRef} style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none', flex: 1 }}>
                {defaultCategories.map(category => (
                  <button key={category} onClick={() => handleSelectCategory(category)} style={{ padding: '0.65rem 1.1rem', background: 'none', border: 'none', borderBottom: selectedCategory === category ? '2.5px solid #6366f1' : '2.5px solid transparent', color: selectedCategory === category ? '#111827' : '#6b7280', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '500', fontSize: '0.88rem', whiteSpace: 'nowrap', transition: 'all 0.15s ease', letterSpacing: '-0.01em' }}>
                    {category}
                  </button>
                ))}
                {customCategories.length > 0 && (
                  <>
                    <span style={{ width: '1px', background: '#e5e7eb', margin: '0.5rem 0.4rem', flexShrink: 0 }} />
                    {customCategories.map(category => (
                      <button key={category} onClick={() => handleSelectCategory(category)} style={{ padding: '0.65rem 1.1rem', background: 'none', border: 'none', borderBottom: selectedCategory === category ? '2.5px solid #ec4899' : '2.5px solid transparent', color: selectedCategory === category ? '#111827' : '#6b7280', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '500', fontSize: '0.88rem', whiteSpace: 'nowrap', transition: 'all 0.15s ease', letterSpacing: '-0.01em' }}>
                        {category}
                      </button>
                    ))}
                  </>
                )}
              </div>
              {showCategoryRightArrow && (
                <button onClick={() => { categoryScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' }); }} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 0.4rem', fontSize: '1.1rem' }}>›</button>
              )}
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
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '1.4rem', color: '#111827' }}>Add Custom Category</h2>

            <div style={{ marginBottom: '1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151' }}>Category Title</label>
                <span style={{ fontSize: '0.75rem', color: newCategory.length >= 25 ? '#ef4444' : '#9ca3af' }}>{newCategory.length}/25</span>
              </div>
              <input
                type="text"
                placeholder="e.g., Lakers"
                value={newCategory}
                maxLength={25}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ width: '100%', padding: '0.78rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.93rem', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: '0.3rem', marginBottom: 0 }}>Shown on the category pill — keep it short</p>
            </div>

            <div style={{ marginBottom: '1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151' }}>Description</label>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>used for news generation</span>
              </div>
              <textarea
                placeholder="e.g., Los Angeles Lakers NBA playoffs, trades, and team news"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.78rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.93rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            <button onClick={handleAddCategory} disabled={!newCategory.trim()} style={{ width: '100%', padding: '0.82rem', background: newCategory.trim() ? 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)' : '#e5e7eb', color: newCategory.trim() ? 'white' : '#9ca3af', border: 'none', borderRadius: '999px', cursor: newCategory.trim() ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.6rem', transition: 'all 0.15s' }}>
              Add Category
            </button>
            <button onClick={() => { setShowCategoryModal(false); setNewCategory(''); setNewCategoryDescription(''); }} style={{ width: '100%', padding: '0.78rem', background: 'none', border: '1.5px solid #e5e7eb', color: '#374151', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>
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
                    {day.fullDate === today ? 'Today' : `${day.label} ${day.date}`}
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
                  {day.fullDate === today ? 'Today' : `${day.label} ${day.date}`}
                </button>
              ))}
              <span style={{ color: '#e5e7eb', margin: '0 0.1rem', userSelect: 'none' }}>|</span>
              {availableTimes.map(time => (
                <button key={time.value} onClick={() => !isTimeFuture(time.value) && setSelectedTime(time.value)} disabled={isTimeFuture(time.value)} style={timePill(selectedTime === time.value, isTimeFuture(time.value))}>
                  <span>{time.label}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: '400', opacity: 0.75 }}>{time.time}</span>
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
                {defaultCategories.map(category => (
                  <button key={category} onClick={() => { handleSelectCategory(category); setShowCategoryMenu(false); }} style={{ padding: '0.62rem 0.9rem', background: selectedCategory === category ? 'rgba(99,102,241,0.08)' : 'transparent', color: selectedCategory === category ? '#6366f1' : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                    {category}
                  </button>
                ))}
                {customCategories.length > 0 && (
                  <>
                    <div style={{ margin: '0.5rem 0 0.25rem', padding: '0 0.9rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Custom</span>
                    </div>
                    {customCategories.map(category => (
                      <button key={category} onClick={() => { handleSelectCategory(category); setShowCategoryMenu(false); }} style={{ padding: '0.62rem 0.9rem', background: selectedCategory === category ? 'rgba(236,72,153,0.08)' : 'transparent', color: selectedCategory === category ? '#ec4899' : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                        {category}
                      </button>
                    ))}
                  </>
                )}
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
                    {day.fullDate === today ? 'Today' : `${day.label} ${day.date}`}
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
                  <button key={time.value} onClick={() => { if (!isTimeFuture(time.value)) { setSelectedTime(time.value); setShowTimeMenu(false); } }} disabled={isTimeFuture(time.value)} style={{ padding: '0.62rem 0.9rem', background: selectedTime === time.value ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent', color: selectedTime === time.value ? 'white' : isTimeFuture(time.value) ? '#d1d5db' : '#374151', border: 'none', borderRadius: '8px', cursor: isTimeFuture(time.value) ? 'not-allowed' : 'pointer', fontWeight: selectedTime === time.value ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', transition: 'all 0.12s ease', opacity: isTimeFuture(time.value) ? 0.45 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{time.label}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '400', opacity: 0.6 }}>{time.time}</span>
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
                  <button key={time.value} onClick={() => !isTimeFuture(time.value) && setSelectedTime(time.value)} disabled={isTimeFuture(time.value)} style={timePill(selectedTime === time.value, isTimeFuture(time.value))}>
                    <span>{time.label}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: '400', opacity: 0.75 }}>{time.time}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding: '1.75rem 2rem' }}>
              {newsLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  {customCategories.includes(selectedCategory) ? (
                    <div style={{ maxWidth: '360px', margin: '0 auto' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.35rem', color: '#111827' }}>
                        Generating Custom News
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
                        {generationProgress < 30 ? 'Searching the web…' : generationProgress < 65 ? 'Reading sources…' : generationProgress < 90 ? 'Compiling summary…' : 'Almost done…'}
                      </p>
                      <div style={{ background: '#f3f4f6', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', width: `${generationProgress}%`, transition: 'width 0.4s ease' }} />
                      </div>
                      <p style={{ color: '#d1d5db', fontSize: '0.75rem', margin: '0.6rem 0 0' }}>{Math.round(generationProgress)}%</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'inline-block', animation: 'spin 2s linear infinite' }}>
                        <Loader size={48} color="#6366f1" strokeWidth={1.5} />
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '1.5rem 0 0.4rem', color: '#111827' }}>Loading Your News</h3>
                      <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Retrieving pre-generated news…</p>
                    </>
                  )}
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
                  {(() => {
                    window._trackCategory = (headline) => { setNewCategory(''); setNewCategoryDescription(headline); setShowCategoryModal(true); };
                    const raw = newsSummary.content || '';

                    // Split off ## Sources section — handles ## Sources, ## [Sources](url), ### Sources, etc.
                    const sourcesStart = raw.search(/^#{1,3} (?:\[)?Sources(?:\]|\()?/im);
                    const beforeSources = sourcesStart > -1 ? raw.slice(0, sourcesStart).trim() : raw.trim();
                    const sourcesSection = sourcesStart > -1 ? raw.slice(sourcesStart) : '';
                    const sourceLinks = [...sourcesSection.matchAll(/[-*\d.]\s*\[([^\]]+)\]\(([^)\s]+)\)/g)]
                      .map(m => ({ title: m[1], url: m[2] }))
                      .filter((s, i, arr) => arr.findIndex(x => x.url === s.url) === i); // dedupe

                    // Extract top note (content before first ## heading, e.g. _Note: ..._)
                    const firstStoryIdx = beforeSources.search(/^#{1,3} /m);
                    const topNote = firstStoryIdx > 0 ? beforeSources.slice(0, firstStoryIdx).trim() : '';
                    const mainContent = firstStoryIdx > 0 ? beforeSources.slice(firstStoryIdx).trim() : beforeSources;

                    // Render main summary
                    const html = mainContent
                      // Fix ## alone on its own line — join with next line
                      .replace(/^(#{1,3})\s*\n(?!\s*\n)/gm, '$1 ')
                      // Fix missing [ in ## Title](URL)
                      .replace(/^(#{1,3} )(?!\[)([^\n]+\]\(https?:\/\/)/gm, '$1[$2')
                      // Remove orphaned lines that are just punctuation or empty bullets
                      .replace(/^[-*.]\s*$/gm, '')
                      .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;color:#111827;">$1</strong>')
                      // Italic _text_ — used for availability disclaimers
                      .replace(/_(.*?)_/g, '<em style="color:#9ca3af;font-style:italic;">$1</em>')
                      // Linked heading ## [Title](URL) — clickable + Track button
                      .replace(/^#{1,3} \[(.+?)\]\(([^)\s]+)\)/gm, (_, text, url) => {
                        const safe = text.replace(/'/g, '&#39;');
                        const safeUrl = url.replace(/"/g, '%22');
                        return `<div style="display:flex;align-items:baseline;gap:0.45rem;margin:1.1rem 0 0.25rem;flex-wrap:wrap;padding-top:0.6rem;border-top:1px solid #f3f4f6;"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="font-size:1.02rem;font-weight:800;color:#111827;text-decoration:underline;text-decoration-color:#d1d5db;text-underline-offset:2px;line-height:1.3;">${text}</a><button onclick="window._trackCategory('${safe}')" title="Track this topic" style="flex-shrink:0;padding:0.1rem 0.38rem;font-size:0.65rem;font-weight:700;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.3);border-radius:999px;color:#6366f1;cursor:pointer;line-height:1.5;">+ Track</button></div>`;
                      })
                      // Plain heading — no track button
                      .replace(/^#{1,3} (.+)$/gm, (_, text) =>
                        `<div style="font-size:1.02rem;font-weight:800;color:#374151;margin:1.1rem 0 0.25rem;padding-top:0.6rem;border-top:1px solid #f3f4f6;line-height:1.3;">${text}</div>`
                      )
                      // "Why this matters" line — styled distinctly before general bold replacement
                      .replace(/^\*\*Why this matters:\*\*\s*(.+)$/gm, (_, text) =>
                        `<div style="margin:0.45rem 0 0.9rem;padding:0.38rem 0.7rem;background:rgba(99,102,241,0.05);border-left:3px solid #6366f1;border-radius:0 6px 6px 0;font-size:0.82rem;color:#6b7280;line-height:1.5;"><strong style="color:#6366f1;font-weight:700;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.03em;">Why this matters</strong><br>${text}</div>`
                      )
                      .replace(/^[-*] (.+)$/gm, '<div style="margin:0.18rem 0 0.18rem 0.8rem;padding-left:0.55rem;border-left:2px solid #e5e7eb;color:#374151;font-size:0.88rem;line-height:1.5;">$1</div>')
                      .replace(/\n\n+/g, '<div style="height:0.15rem;"></div>')
                      .replace(/\n/g, '');

                    const getDomain = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

                    return (
                      <>
                        {/* Date availability note — shown above sources */}
                        {topNote && (
                          <p style={{ fontStyle: 'italic', color: '#9ca3af', fontSize: '0.82rem', margin: '0 0 1rem', lineHeight: '1.5' }}
                            dangerouslySetInnerHTML={{ __html: topNote
                              .replace(/^_+|_+$/g, '')
                              .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#6b7280;font-weight:700;">$1</strong>')
                            }}
                          />
                        )}

                        {/* Sources cards — shown at top */}
                        {sourceLinks.length > 0 && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.65rem' }}>Sources</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '0.55rem' }}>
                              {sourceLinks.map((s, i) => {
                                const domain = getDomain(s.url);
                                const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                                return (
                                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.7rem 0.8rem', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', textDecoration: 'none', transition: 'box-shadow 0.15s', cursor: 'pointer' }}
                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.12)'}
                                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                      <img src={favicon} alt="" width={14} height={14} style={{ borderRadius: '3px', flexShrink: 0 }} onError={e => e.target.style.display='none'} />
                                      <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain}</span>
                                    </div>
                                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#1e293b', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.title}</span>
                                    <span style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: '600', marginTop: 'auto' }}>Read article ↗</span>
                                  </a>
                                );
                              })}
                            </div>
                            <div style={{ borderTop: '1px solid #f3f4f6', marginTop: '1.25rem' }} />
                          </div>
                        )}

                        {/* Summary */}
                        <div style={{ fontSize: '0.92rem', lineHeight: '1.5', color: '#1e293b' }} dangerouslySetInnerHTML={{ __html: html }} />
                      </>
                    );
                  })()}
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
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.55rem' }}>Categories to receive</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {defaultCategories.map(cat => {
                    const active = (emailPreferences.categories || []).includes(cat);
                    const isLast = active && (emailPreferences.categories || []).length === 1;
                    return (
                      <button key={cat} onClick={() => handleCategoryEmailToggle(cat)} title={isLast ? 'At least one category must be selected' : ''} style={{ padding: '0.32rem 0.8rem', fontSize: '0.8rem', fontWeight: active ? '700' : '500', background: active ? '#6366f1' : 'white', color: active ? 'white' : '#6b7280', border: active ? 'none' : '1.5px solid #e5e7eb', borderRadius: '999px', cursor: isLast ? 'not-allowed' : 'pointer', opacity: isLast ? 0.6 : 1, transition: 'all 0.12s ease' }}>
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '0 0 1rem' }} />
              <p style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.55rem' }}>Delivery times</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.55rem' }}>
                {timesOfDay.map(time => {
                  const slotKey = time.value.toLowerCase();
                  const isEnabled = !!emailPreferences[slotKey];
                  return (
                    <label key={time.value} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.8rem 1rem', background: isEnabled ? 'rgba(99,102,241,0.04)' : 'rgba(0,0,0,0.02)', border: isEnabled ? '1.5px solid #6366f1' : '1.5px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                      <input type="checkbox" checked={isEnabled} onChange={() => handleEmailSlotToggle(slotKey)} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#6366f1', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#111827' }}>{time.label}</div>
                        <div style={{ fontSize: '0.73rem', color: '#9ca3af' }}>{time.time}</div>
                      </div>
                    </label>
                  );
                })}
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
                  {customCategories.map(category => {
                    const desc = customCategoryDescriptions[category];
                    const hasDesc = !!desc;
                    return (
                      <div key={category} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0.75rem 0.9rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid #f3f4f6', gap: '0.6rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.88rem' }}>{category}</div>
                          {hasDesc && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem', lineHeight: '1.4', wordBreak: 'break-word' }}>{desc}</div>}
                        </div>
                        <button onClick={() => handleDeleteCategory(category)} style={{ padding: '0.3rem 0.45rem', background: 'rgba(231,76,60,0.08)', border: 'none', borderRadius: '6px', color: '#e74c3c', cursor: 'pointer', flexShrink: 0 }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
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
