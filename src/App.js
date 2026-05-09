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
    night: false,
    morning: false,
    noon: false,
    afternoon: false,
    evening: false
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

  const [showCategoryLeftArrow, setShowCategoryLeftArrow] = useState(false);
  const [showCategoryRightArrow, setShowCategoryRightArrow] = useState(true);
  const [showDayLeftArrow, setShowDayLeftArrow] = useState(false);
  const [showDayRightArrow, setShowDayRightArrow] = useState(true);
  const [showTimeLeftArrow, setShowTimeLeftArrow] = useState(false);
  const [showTimeRightArrow, setShowTimeRightArrow] = useState(true);

  const defaultCategories = [
    'World News',
    'Technology',
    'Business',
    'Politics',
    'Sports',
    'Entertainment',
    'Science',
    'Health'
  ];

  const timesOfDay = [
    { value: 'Night', label: 'Night', time: '12 AM - 6 AM' },
    { value: 'Morning', label: 'Morning', time: '6 AM - 10 AM' },
    { value: 'Noon', label: 'Noon', time: '10 AM - 2 PM' },
    { value: 'Afternoon', label: 'Afternoon', time: '2 PM - 6 PM' },
    { value: 'Evening', label: 'Evening', time: '6 PM - 12 AM' }
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
  const availableDays = isCustomCategory ? daysOfWeek.filter(d => d.fullDate === today) : daysOfWeek;

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
    if (hour >= 6 && hour < 10) defaultTime = 'Morning';
    else if (hour >= 10 && hour < 14) defaultTime = 'Noon';
    else if (hour >= 14 && hour < 18) defaultTime = 'Afternoon';
    else if (hour >= 18 && hour < 24) defaultTime = 'Evening';
    setSelectedTime(defaultTime);
    try {
      const savedUser = localStorage.getItem('newsdigest_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setEmailPreferences(userData.emailPreferences || {
          night: false, morning: false, noon: false, afternoon: false, evening: false
        });
        supabase.from('custom_categories').select('category_name').eq('user_id', userData.id)
          .then(({ data }) => {
            const cats = data?.map(c => c.category_name) || [];
            setCustomCategories(cats);
            const updated = { ...userData, categories: cats };
            localStorage.setItem('newsdigest_user', JSON.stringify(updated));
            setUser(updated);
          });
      }
    } catch (error) {
      console.error('Init error:', error);
    }
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
    const timeRef = timeScrollRef.current;
    const handleCategoryScroll = () => checkScrollPosition(categoryScrollRef, setShowCategoryLeftArrow, setShowCategoryRightArrow);
    const handleDayScroll = () => checkScrollPosition(dayScrollRef, setShowDayLeftArrow, setShowDayRightArrow);
    const handleTimeScroll = () => checkScrollPosition(timeScrollRef, setShowTimeLeftArrow, setShowTimeRightArrow);
    if (categoryRef) categoryRef.addEventListener('scroll', handleCategoryScroll);
    if (dayRef) dayRef.addEventListener('scroll', handleDayScroll);
    if (timeRef) timeRef.addEventListener('scroll', handleTimeScroll);
    handleCategoryScroll();
    handleDayScroll();
    handleTimeScroll();
    const timeoutId = setTimeout(() => {
      handleCategoryScroll();
      handleDayScroll();
      handleTimeScroll();
    }, 100);
    return () => {
      if (categoryRef) categoryRef.removeEventListener('scroll', handleCategoryScroll);
      if (dayRef) dayRef.removeEventListener('scroll', handleDayScroll);
      if (timeRef) timeRef.removeEventListener('scroll', handleTimeScroll);
      clearTimeout(timeoutId);
    };
  }, [customCategories, daysOfWeek, timesOfDay]);

  const handleFetchNews = async () => {
    if (!selectedCategory || !selectedDay || !selectedTime) return;
    if (newsSummary &&
        newsSummary.category === selectedCategory &&
        newsSummary.day === selectedDay &&
        newsSummary.time_slot === selectedTime) {
      return;
    }
    setNewsLoading(true);
    setNewsNotAvailable(false);
    try {
      const { data, error } = await supabase
        .from('news_summaries')
        .select('*')
        .eq('category', selectedCategory)
        .eq('day', selectedDay)
        .eq('time_slot', selectedTime)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setNewsNotAvailable(true);
        setNewsSummary(null);
        return;
      }
      setNewsSummary(data);
      setNewsNotAvailable(false);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsNotAvailable(true);
      setNewsSummary(null);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleGenerateCustomCategory = async () => {
    if (!customCategories.includes(selectedCategory)) return;
    try {
      setNewsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/generate/custom-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          category: selectedCategory,
          day: selectedDay,
          timeSlot: selectedTime
        })
      });
      if (!response.ok) { setNewsLoading(false); return; }
      const category = selectedCategory;
      const day = selectedDay;
      const time = selectedTime;
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const { data } = await supabase
          .from('news_summaries')
          .select('*')
          .eq('category', category)
          .eq('day', day)
          .eq('time_slot', time)
          .maybeSingle();
        if (data) {
          setNewsSummary(data);
          setNewsNotAvailable(false);
          setNewsLoading(false);
        } else if (attempts < 36) {
          setTimeout(poll, 5000);
        } else {
          setNewsLoading(false);
          setNewsNotAvailable(true);
        }
      };
      setTimeout(poll, 5000);
    } catch (error) {
      console.error('Error generating custom category news:', error);
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    if (isCustomCategory && selectedTime && !availableTimes.find(t => t.value === selectedTime)) {
      setSelectedTime(currentTimeSlot);
    }
  }, [isCustomCategory, availableTimes, selectedTime, currentTimeSlot]);

  useEffect(() => {
    if (selectedCategory && selectedDay && selectedTime) {
      handleFetchNews();
    }
  }, [selectedCategory, selectedDay, selectedTime]);

  useEffect(() => {
    if (newsNotAvailable && customCategories.includes(selectedCategory) && user) {
      handleGenerateCustomCategory();
    }
  }, [newsNotAvailable, selectedCategory]);

  const handleAuth = async () => {
    if (!email || !password) return;
    if (authMode === 'signup') {
      try {
        setShowAuth(false);
        const response = await fetch(`${BACKEND_URL}/api/auth/send-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
          const errorData = await response.json();
          alert('Failed to sign up: ' + errorData.error);
          setShowAuth(true);
          return;
        }
        alert(`Verification email sent to ${email}! Please check your email.`);
        setEmail('');
        setPassword('');
        setAuthMode('signin');
      } catch (error) {
        alert('Error during sign-up: ' + error.message);
        setShowAuth(true);
      }
    } else {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) { alert('Failed to sign in: ' + authError.message); return; }
        if (!authData.user) { alert('Sign-in failed. Please try again.'); return; }
        const { data: userProfile, error: profileError } = await supabase
          .from('users').select('*').eq('id', authData.user.id).single();
        if (profileError) { alert('Failed to load user profile'); return; }
        if (userProfile.verification_status !== 'verified') {
          alert('Please verify your email first. Check your inbox for the verification link.');
          return;
        }
        const { data: categoriesData } = await supabase
          .from('custom_categories').select('category_name').eq('user_id', authData.user.id);
        const categories = categoriesData?.map(c => c.category_name) || [];
        const userData = {
          id: authData.user.id,
          email: authData.user.email,
          categories,
          emailPreferences: { night: false, morning: false, noon: false, afternoon: false, evening: false }
        };
        localStorage.setItem('newsdigest_user', JSON.stringify(userData));
        setUser(userData);
        setCustomCategories(categories);
        setEmailPreferences(userData.emailPreferences || {});
        setShowAuth(false);
        setShowMobileMenu(false);
        setEmail('');
        setPassword('');
      } catch (error) {
        alert('Error during sign-in: ' + error.message);
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !user) return;
    const { error } = await supabase
      .from('custom_categories')
      .insert({ user_id: user.id, category_name: newCategory.trim() });
    if (error) { alert('Failed to add category: ' + error.message); return; }
    const updated = { ...user, categories: [...(user.categories || []), newCategory.trim()] };
    localStorage.setItem('newsdigest_user', JSON.stringify(updated));
    setUser(updated);
    setCustomCategories(updated.categories);
    setNewCategory('');
    setShowCategoryModal(false);
  };

  const handleDeleteCategory = async (categoryToDelete) => {
    const { error } = await supabase
      .from('custom_categories')
      .delete()
      .eq('user_id', user.id)
      .eq('category_name', categoryToDelete);
    if (error) { console.error('Error deleting category:', error); return; }
    const updated = { ...user, categories: user.categories.filter(cat => cat !== categoryToDelete) };
    localStorage.setItem('newsdigest_user', JSON.stringify(updated));
    setUser(updated);
    setCustomCategories(updated.categories);
    if (selectedCategory === categoryToDelete) setSelectedCategory('World News');
  };

  const handleEmailPreferenceToggle = (timeValue) => {
    const updated = { ...emailPreferences, [timeValue]: !emailPreferences[timeValue] };
    setEmailPreferences(updated);
    if (user) {
      const userData = { ...user, emailPreferences: updated };
      localStorage.setItem('newsdigest_user', JSON.stringify(userData));
      setUser(userData);
    }
  };

  const scrollContainer = (ref, direction) => {
    if (ref.current) {
      ref.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  const checkScrollPosition = (ref, setLeftArrow, setRightArrow) => {
    if (ref.current) {
      setLeftArrow(ref.current.scrollLeft > 0);
      setRightArrow(ref.current.scrollLeft < ref.current.scrollWidth - ref.current.clientWidth - 10);
    }
  };

  const isMobile = windowWidth < 768;

  /* ─── shared day pill style ─── */
  const dayPill = (isActive) => ({
    padding: '0.38rem 0.85rem',
    background: isActive ? '#0A0A0A' : 'transparent',
    color: isActive ? 'white' : '#374151',
    border: isActive ? 'none' : '1px solid #d1d5db',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: isActive ? '700' : '400',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    lineHeight: 1.4
  });

  const timePill = (isActive) => ({
    padding: '0.28rem 0.75rem',
    background: isActive ? '#CC0000' : 'transparent',
    color: isActive ? 'white' : '#6b7280',
    border: isActive ? 'none' : '1px solid #d1d5db',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: isActive ? '700' : '400',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    lineHeight: 1.4
  });

  const navBtn = (disabled) => ({
    padding: '0.35rem 0.55rem',
    background: 'none',
    border: 'none',
    borderRadius: '3px',
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? '#d1d5db' : '#374151',
    flexShrink: 0,
    fontSize: '1.1rem',
    lineHeight: 1,
    userSelect: 'none'
  });

  return (
    <div style={{ background: '#F0F0F0', minHeight: '100vh', overflowY: 'scroll', overflowX: 'hidden' }}>
      <style>{`
        html { overflow-y: scroll; }
        body { overflow-y: scroll; }
        * { box-sizing: border-box; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: '#0A0A0A', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Brand row */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #CC0000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <Sparkles size={20} color="#CC0000" />
            <h1 style={{ fontSize: '1.45rem', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '0.06em', fontFamily: 'Georgia, serif', textTransform: 'uppercase' }}>
              The AI Rundown
            </h1>
          </div>

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
              {user && (
                <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.4rem 0.9rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '3px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: '600' }}>
                  <Plus size={13} /> Add Category
                </button>
              )}
              {user ? (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: 'white' }}>
                    <User size={13} /> {user.email}
                  </button>
                  {showUserMenu && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '3px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', marginTop: '0.35rem', zIndex: 1000, minWidth: '155px' }}>
                      <button onClick={() => { setCurrentView('settings'); setShowUserMenu(false); }} style={{ width: '100%', padding: '0.65rem 1.1rem', background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0', textAlign: 'left', cursor: 'pointer', fontSize: '0.88rem', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Settings size={13} /> Settings
                      </button>
                      <button onClick={async () => { await supabase.auth.signOut(); setUser(null); localStorage.removeItem('newsdigest_user'); setShowUserMenu(false); setCurrentView('home'); }} style={{ width: '100%', padding: '0.65rem 1.1rem', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.88rem', color: '#CC0000', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <LogOut size={13} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => { setShowAuth(true); setAuthMode('signin'); }} style={{ padding: '0.42rem 1.1rem', background: '#CC0000', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                  Sign In
                </button>
              )}
            </div>
          )}

          {isMobile && (
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
              {showMobileMenu ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>

        {/* Category nav bar */}
        {windowWidth > 1100 && (
          <div style={{ background: '#141414', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
              <div ref={categoryScrollRef} style={{ display: 'flex', alignItems: 'stretch', gap: 0, overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {allCategories.map(category => (
                  <button key={category} onClick={() => handleSelectCategory(category)} style={{ padding: '0.62rem 1rem', background: 'none', border: 'none', borderBottom: selectedCategory === category ? '3px solid #CC0000' : '3px solid transparent', color: selectedCategory === category ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '400', fontSize: '0.82rem', whiteSpace: 'nowrap', transition: 'all 0.15s ease', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {isMobile && showMobileMenu && (
          <div style={{ background: '#141414', borderTop: '1px solid #2a2a2a', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {user && (
              <>
                <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '3px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '600' }}>
                  <Plus size={14} /> Add Custom Category
                </button>
                <button onClick={() => { setCurrentView('settings'); setShowMobileMenu(false); }} style={{ padding: '0.6rem 1rem', background: 'none', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '3px', cursor: 'pointer', fontSize: '0.88rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Settings size={13} /> Settings
                </button>
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); localStorage.removeItem('newsdigest_user'); setShowMobileMenu(false); setCurrentView('home'); }} style={{ padding: '0.6rem 1rem', background: 'none', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '3px', cursor: 'pointer', fontSize: '0.88rem', color: '#CC0000', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LogOut size={13} /> Sign Out
                </button>
              </>
            )}
            {!user && (
              <button onClick={() => { setShowAuth(true); setAuthMode('signin'); setShowMobileMenu(false); }} style={{ padding: '0.6rem 1.25rem', background: '#CC0000', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>
                Sign In
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── Auth Modal ── */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '4px', padding: '2rem', maxWidth: '370px', width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '1.5rem', textAlign: 'center', color: '#0A0A0A', fontFamily: 'Georgia, serif' }}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.72rem', marginBottom: '0.7rem', border: '1px solid #d1d5db', borderRadius: '3px', fontSize: '0.93rem', outline: 'none' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.72rem', marginBottom: '1.2rem', border: '1px solid #d1d5db', borderRadius: '3px', fontSize: '0.93rem', outline: 'none' }} />
            <button onClick={handleAuth} style={{ width: '100%', padding: '0.78rem', background: '#CC0000', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.65rem' }}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} style={{ width: '100%', padding: '0.75rem', background: 'none', border: '1px solid #d1d5db', color: '#374151', borderRadius: '3px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.65rem' }}>
              {authMode === 'signin' ? 'Create Account Instead' : 'Sign In Instead'}
            </button>
            <button onClick={() => { setShowAuth(false); setEmail(''); setPassword(''); }} style={{ width: '100%', padding: '0.7rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.88rem' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Add Category Modal ── */}
      {showCategoryModal && user && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '4px', padding: '2rem', maxWidth: '370px', width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '1.2rem', color: '#0A0A0A', fontFamily: 'Georgia, serif' }}>Add Custom Category</h2>
            <input type="text" placeholder="e.g., Los Angeles Lakers" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ width: '100%', padding: '0.72rem', marginBottom: '1.2rem', border: '1px solid #d1d5db', borderRadius: '3px', fontSize: '0.93rem' }} />
            <button onClick={handleAddCategory} style={{ width: '100%', padding: '0.78rem', background: '#CC0000', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.65rem' }}>
              Add Category
            </button>
            <button onClick={() => setShowCategoryModal(false)} style={{ width: '100%', padding: '0.75rem', background: 'none', border: '1px solid #d1d5db', color: '#374151', borderRadius: '3px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      {currentView === 'home' && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 2rem 3rem 2rem' }}>

          {/* Mobile trigger buttons */}
          <div style={{ marginBottom: '0.65rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {windowWidth <= 1100 && (
              <button onClick={() => setShowCategoryMenu(!showCategoryMenu)} style={{ padding: '0.4rem 0.85rem', background: '#1a1a2e', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                ☰ {selectedCategory}
              </button>
            )}
            {windowWidth <= 900 && (
              <button onClick={() => setShowDayMenu(!showDayMenu)} style={{ padding: '0.4rem 0.85rem', background: '#1a1a2e', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                📅 {availableDays.find(d => d.fullDate === selectedDay)?.label || 'Days'}
              </button>
            )}
            {windowWidth <= 750 && (
              <button onClick={() => setShowTimeMenu(!showTimeMenu)} style={{ padding: '0.4rem 0.85rem', background: '#1a1a2e', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                🕐 {availableTimes.find(t => t.value === selectedTime)?.label || 'Times'}
              </button>
            )}
          </div>

          {/* Day navigation row — standard categories */}
          {windowWidth > 900 && !isCustomCategory && (
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'white', padding: '0.55rem 0.9rem', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <button
                onClick={() => { const n = weekOffset - 1; setWeekOffset(n); setSelectedDay(getDaysOfWeek(n)[6].fullDate); }}
                disabled={weekOffset <= -3}
                style={navBtn(weekOffset <= -3)}>
                ‹
              </button>
              <div ref={dayScrollRef} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {availableDays.map(day => (
                  <button key={day.fullDate} onClick={() => setSelectedDay(day.fullDate)} style={dayPill(selectedDay === day.fullDate)}>
                    {day.label} {day.date}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { const n = weekOffset + 1; setWeekOffset(n); setSelectedDay(getDaysOfWeek(n)[6].fullDate); }}
                disabled={weekOffset >= 0}
                style={navBtn(weekOffset >= 0)}>
                ›
              </button>
            </div>
          )}

          {/* Day + time row — custom categories */}
          {windowWidth > 750 && isCustomCategory && (
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', background: 'white', padding: '0.55rem 0.9rem', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              {availableDays.map(day => (
                <button key={day.fullDate} onClick={() => setSelectedDay(day.fullDate)} style={dayPill(selectedDay === day.fullDate)}>
                  {day.label} {day.date}
                </button>
              ))}
              <span style={{ color: '#d1d5db', margin: '0 0.15rem', userSelect: 'none' }}>|</span>
              {availableTimes.map(time => (
                <button key={time.value} onClick={() => setSelectedTime(time.value)} style={timePill(selectedTime === time.value)}>
                  {time.label}
                </button>
              ))}
            </div>
          )}

          {/* Slide-out: categories */}
          {showCategoryMenu && windowWidth <= 1100 && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
              <div onClick={() => setShowCategoryMenu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '270px', background: 'white', boxShadow: '4px 0 20px rgba(0,0,0,0.2)', zIndex: 1000, overflowY: 'auto', animation: 'slideIn 0.22s ease' }}>
                <div style={{ padding: '1.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#0A0A0A', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categories</h3>
                    <button onClick={() => setShowCategoryMenu(false)} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.2rem' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {allCategories.map(category => (
                      <button key={category} onClick={() => { handleSelectCategory(category); setShowCategoryMenu(false); }} style={{ padding: '0.6rem 0.9rem', background: selectedCategory === category ? '#0A0A0A' : 'transparent', color: selectedCategory === category ? 'white' : '#374151', border: 'none', borderLeft: selectedCategory === category ? '3px solid #CC0000' : '3px solid transparent', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '400', fontSize: '0.88rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide-out: days */}
          {showDayMenu && windowWidth <= 900 && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
              <div onClick={() => setShowDayMenu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '270px', background: 'white', boxShadow: '4px 0 20px rgba(0,0,0,0.2)', zIndex: 1000, overflowY: 'auto', animation: 'slideIn 0.22s ease' }}>
                <div style={{ padding: '1.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#0A0A0A', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Days</h3>
                    <button onClick={() => setShowDayMenu(false)} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.2rem' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {availableDays.map(day => (
                      <button key={day.fullDate} onClick={() => { setSelectedDay(day.fullDate); setShowDayMenu(false); }} style={{ padding: '0.6rem 0.9rem', background: selectedDay === day.fullDate ? '#0A0A0A' : 'transparent', color: selectedDay === day.fullDate ? 'white' : '#374151', border: 'none', borderLeft: selectedDay === day.fullDate ? '3px solid #CC0000' : '3px solid transparent', cursor: 'pointer', fontWeight: selectedDay === day.fullDate ? '700' : '400', fontSize: '0.88rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                        {day.label} {day.date}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide-out: times */}
          {showTimeMenu && windowWidth <= 750 && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
              <div onClick={() => setShowTimeMenu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '270px', background: 'white', boxShadow: '4px 0 20px rgba(0,0,0,0.2)', zIndex: 1000, overflowY: 'auto', animation: 'slideIn 0.22s ease' }}>
                <div style={{ padding: '1.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#0A0A0A', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Times</h3>
                    <button onClick={() => setShowTimeMenu(false)} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.2rem' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {availableTimes.map(time => (
                      <button key={time.value} onClick={() => { setSelectedTime(time.value); setShowTimeMenu(false); }} style={{ padding: '0.6rem 0.9rem', background: selectedTime === time.value ? '#CC0000' : 'transparent', color: selectedTime === time.value ? 'white' : '#374151', border: 'none', borderLeft: selectedTime === time.value ? '3px solid #0A0A0A' : '3px solid transparent', cursor: 'pointer', fontWeight: selectedTime === time.value ? '700' : '400', fontSize: '0.88rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                        {time.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── News Card ── */}
          <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.09)', minHeight: '500px' }}>

            {/* Time selector — top-left inside card */}
            {windowWidth > 750 && !isCustomCategory && (
              <div style={{ padding: '0.7rem 2rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {availableTimes.map(time => (
                  <button key={time.value} onClick={() => setSelectedTime(time.value)} style={timePill(selectedTime === time.value)}>
                    {time.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding: '2rem' }}>
              {newsLoading ? (
                <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                  <div style={{ display: 'inline-block', animation: 'spin 2s linear infinite' }}>
                    <Loader size={44} color="#CC0000" strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.4rem', marginTop: '1.4rem', color: '#0A0A0A', fontFamily: 'Georgia, serif' }}>
                    {customCategories.includes(selectedCategory) ? 'Generating Custom News' : 'Loading Your News'}
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '0.88rem', margin: 0 }}>
                    {customCategories.includes(selectedCategory) ? 'Searching the web and compiling…' : 'Retrieving pre-generated news…'}
                  </p>
                </div>
              ) : newsNotAvailable ? (
                <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                  <Clock size={38} color="#d1d5db" style={{ marginBottom: '1.1rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.4rem', color: '#374151', fontFamily: 'Georgia, serif', margin: '0 0 0.4rem 0' }}>News Not Yet Available</h3>
                  <p style={{ fontSize: '0.88rem', color: '#9ca3af', margin: 0 }}>This summary hasn't been generated yet.</p>
                </div>
              ) : newsSummary ? (
                <div>
                  <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem' }}>
                      <span style={{ display: 'inline-block', width: '3px', height: '1.5rem', background: '#CC0000', borderRadius: '1px', flexShrink: 0 }} />
                      <h2 style={{ fontSize: '1.45rem', fontWeight: '900', margin: 0, color: '#0A0A0A', fontFamily: 'Georgia, serif', letterSpacing: '-0.01em', lineHeight: '1.2' }}>
                        {newsSummary.category}
                      </h2>
                    </div>
                    <div style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#6b7280', paddingLeft: '0.7rem' }}>
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
                  <div style={{ fontSize: '0.96rem', lineHeight: '1.75', color: '#1e293b', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}
                    dangerouslySetInnerHTML={{ __html: newsSummary.content
                      .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 700; color: #0A0A0A;">$1</strong>')
                      .replace(/^(#{1,3})\s+(.+)$/gm, (match, hashes, text) => {
                        const level = hashes.length;
                        const sizes = { 1: '1.35rem', 2: '1.15rem', 3: '1.05rem' };
                        return `<h${level + 2} style="font-size:${sizes[level]};font-weight:800;color:#0A0A0A;margin:1.1rem 0 0.4rem 0;line-height:1.3;font-family:Georgia,serif;border-left:3px solid #CC0000;padding-left:0.7rem;">${text}</h${level + 2}>`;
                      })
                      .replace(/^- (.+)$/gm, '<div style="margin:0.3rem 0 0.3rem 1rem;padding-left:0.7rem;border-left:2px solid #e5e7eb;color:#374151;">$1</div>')
                      .replace(/\n\n/g, '<div style="height:0.45rem;"></div>')
                    }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                  <Sparkles size={38} color="#d1d5db" style={{ marginBottom: '1.1rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.4rem 0', color: '#374151', fontFamily: 'Georgia, serif' }}>Select your preferences above</h3>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '2rem', background: '#CC0000', borderRadius: '1px' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, color: '#0A0A0A', fontFamily: 'Georgia, serif' }}>Settings & Preferences</h2>
          </div>
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e5e7eb', padding: '1.6rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem' }}>
                <Mail size={18} color="#CC0000" strokeWidth={2} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0A0A0A', fontFamily: 'Georgia, serif' }}>Email Digest Preferences</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.65rem' }}>
                {timesOfDay.map(time => (
                  <label key={time.value} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.9rem', background: emailPreferences[time.value.toLowerCase()] ? 'rgba(204,0,0,0.04)' : 'rgba(0,0,0,0.02)', border: emailPreferences[time.value.toLowerCase()] ? '1px solid rgba(204,0,0,0.28)' : '1px solid #e5e7eb', borderRadius: '3px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={emailPreferences[time.value.toLowerCase()] || false} onChange={() => handleEmailPreferenceToggle(time.value.toLowerCase())} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#CC0000' }} />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0A0A0A' }}>{time.label}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{time.time}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e5e7eb', padding: '1.6rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Search size={18} color="#CC0000" strokeWidth={2} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0A0A0A', fontFamily: 'Georgia, serif' }}>Your Custom Categories</h3>
                </div>
                <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.42rem 0.9rem', background: 'transparent', border: '1px solid #CC0000', borderRadius: '3px', color: '#CC0000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: '700' }}>
                  <Plus size={13} /> Add Category
                </button>
              </div>
              {customCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.25rem', color: '#9ca3af' }}>
                  <p style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>No custom categories yet</p>
                  <p style={{ fontSize: '0.83rem' }}>Create your first personalized news category</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {customCategories.map(category => (
                    <div key={category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.78rem 0.9rem', background: 'rgba(0,0,0,0.02)', borderRadius: '3px', border: '1px solid #e5e7eb' }}>
                      <span style={{ fontWeight: '600', color: '#0A0A0A', fontSize: '0.88rem' }}>{category}</span>
                      <button onClick={() => handleDeleteCategory(category)} style={{ padding: '0.3rem 0.45rem', background: 'rgba(204,0,0,0.08)', border: 'none', borderRadius: '3px', color: '#CC0000', cursor: 'pointer' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setCurrentView('home')} style={{ marginTop: '1.4rem', padding: '0.55rem 1.1rem', background: 'transparent', border: '1px solid #CC0000', borderRadius: '3px', color: '#CC0000', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', letterSpacing: '0.03em' }}>
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
