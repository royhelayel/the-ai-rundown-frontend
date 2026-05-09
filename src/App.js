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

  // Helper: Get current time slot based on UAE timezone
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

  // Filter available times and days for custom categories
  const isCustomCategory = customCategories.includes(selectedCategory);
  const availableTimes = isCustomCategory ? timesOfDay.slice(currentTimeIndex) : timesOfDay;
  const availableDays = isCustomCategory ? daysOfWeek.filter(d => d.fullDate === today) : daysOfWeek;

  // Handle category selection with filtering
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
        // Fetch fresh categories from Supabase
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
        console.log('No news available for:', selectedCategory);
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

      // Poll every 5s until news appears (max 3 minutes)
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
        console.log('Signing up...');
        
        const response = await fetch(`${BACKEND_URL}/api/auth/send-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            password: password
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Sign-up error:', errorData);
          alert('Failed to sign up: ' + errorData.error);
          setShowAuth(true);
          return;
        }

        console.log('Sign-up successful, verification email sent');
        alert(`Verification email sent to ${email}! Please check your email.`);
        
        setEmail('');
        setPassword('');
        setAuthMode('signin');
        
      } catch (error) {
        console.error('Sign-up error:', error);
        alert('Error during sign-up: ' + error.message);
        setShowAuth(true);
      }
    } else {
      try {
        console.log('Signing in...');
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (authError) {
          console.error('Sign-in error:', authError);
          alert('Failed to sign in: ' + authError.message);
          return;
        }

        if (!authData.user) {
          alert('Sign-in failed. Please try again.');
          return;
        }

        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          alert('Failed to load user profile');
          return;
        }

        if (userProfile.verification_status !== 'verified') {
          alert('Please verify your email first. Check your inbox for the verification link.');
          return;
        }

        const { data: categoriesData } = await supabase
          .from('custom_categories')
          .select('category_name')
          .eq('user_id', authData.user.id);

        const categories = categoriesData?.map(c => c.category_name) || [];

        const userData = {
          id: authData.user.id,
          email: authData.user.email,
          categories,
          emailPreferences: {
            night: false, morning: false, noon: false, afternoon: false, evening: false
          }
        };

        localStorage.setItem('newsdigest_user', JSON.stringify(userData));
        setUser(userData);
        setCustomCategories(categories);
        setEmailPreferences(userData.emailPreferences || {});
        setShowAuth(false);
        setShowMobileMenu(false);
        setEmail('');
        setPassword('');

        console.log('User logged in:', userData.email);

      } catch (error) {
        console.error('Sign-in error:', error);
        alert('Error during sign-in: ' + error.message);
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !user) return;

    const { error } = await supabase
      .from('custom_categories')
      .insert({ user_id: user.id, category_name: newCategory.trim() });

    if (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category: ' + error.message);
      return;
    }

    const updated = {
      ...user,
      categories: [...(user.categories || []), newCategory.trim()]
    };
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

    if (error) {
      console.error('Error deleting category:', error);
      return;
    }

    const updated = {
      ...user,
      categories: user.categories.filter(cat => cat !== categoryToDelete)
    };
    localStorage.setItem('newsdigest_user', JSON.stringify(updated));
    setUser(updated);
    setCustomCategories(updated.categories);
    if (selectedCategory === categoryToDelete) setSelectedCategory('All');
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
      const scrollAmount = 200;
      ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const checkScrollPosition = (ref, setLeftArrow, setRightArrow) => {
    if (ref.current) {
      setLeftArrow(ref.current.scrollLeft > 0);
      setRightArrow(ref.current.scrollLeft < ref.current.scrollWidth - ref.current.clientWidth - 10);
    }
  };

  const isMobile = windowWidth < 768;

  return (
    <div style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)', minHeight: '100vh', overflowY: 'scroll', overflowX: 'hidden' }}>
      <style>{`
        html { overflow-y: scroll; }
        body { overflow-y: scroll; }
      `}</style>

      {/* Header */}
      <header style={{ background: 'white', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            <Sparkles size={32} color="#6366f1" />
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>The AI Rundown</h1>
          </div>

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'nowrap', flexShrink: 0 }}>
              {user && (
                <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.65rem 1.25rem', background: 'rgba(99, 102, 241, 0.1)', border: '2px solid #6366f1', borderRadius: '8px', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '700' }}>
                  <Plus size={18} />
                  Add Custom Category
                </button>
              )}
              {user ? (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.08)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '600', color: '#6366f1' }}>
                    <User size={18} />
                    {user.email}
                  </button>
                  {showUserMenu && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid rgba(0, 0, 0, 0.1)', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', marginTop: '0.5rem', zIndex: 1000 }}>
                      <button onClick={() => { setCurrentView('settings'); setShowUserMenu(false); }} style={{ width: '100%', padding: '0.75rem 1.5rem', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.95rem', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Settings size={16} />
                        Settings
                      </button>
                      <button onClick={async () => { await supabase.auth.signOut(); setUser(null); localStorage.removeItem('newsdigest_user'); setShowUserMenu(false); setCurrentView('home'); }} style={{ width: '100%', padding: '0.75rem 1.5rem', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.95rem', color: '#e74c3c', borderTop: '1px solid rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => { setShowAuth(true); setAuthMode('signin'); }} style={{ padding: '0.65rem 1.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}>
                  Sign In
                </button>
              )}
            </div>
          )}

          {isMobile && (
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1' }}>
              {showMobileMenu ? <X size={28} /> : <Menu size={28} />}
            </button>
          )}
        </div>

        {isMobile && showMobileMenu && (
          <div style={{ background: 'white', borderTop: '1px solid rgba(0, 0, 0, 0.1)', padding: '1rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {user && (
              <>
                <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.65rem 1.25rem', background: 'rgba(99, 102, 241, 0.1)', border: '2px solid #6366f1', borderRadius: '8px', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '700' }}>
                  <Plus size={18} />
                  Add Custom Category
                </button>
                <button onClick={() => { setCurrentView('settings'); setShowMobileMenu(false); }} style={{ padding: '0.75rem 1rem', background: 'none', border: '1px solid rgba(0, 0, 0, 0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={16} />
                  Settings
                </button>
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); localStorage.removeItem('newsdigest_user'); setShowMobileMenu(false); setCurrentView('home'); }} style={{ padding: '0.75rem 1rem', background: 'none', border: '1px solid rgba(0, 0, 0, 0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LogOut size={16} />
                  Sign Out
                </button>
              </>
            )}
            {!user && (
              <button onClick={() => { setShowAuth(true); setAuthMode('signin'); setShowMobileMenu(false); }} style={{ padding: '0.65rem 1.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}>
                Sign In
              </button>
            )}
          </div>
        )}
      </header>

      {/* Auth Modal */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '2rem', textAlign: 'center', color: '#1a1a2e' }}>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem', border: '2px solid rgba(0, 0, 0, 0.1)', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.85rem', marginBottom: '1.5rem', border: '2px solid rgba(0, 0, 0, 0.1)', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }} />
            <button onClick={handleAuth} style={{ width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', marginBottom: '1rem' }}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} style={{ width: '100%', padding: '0.85rem', background: 'none', border: '2px solid rgba(99, 102, 241, 0.3)', color: '#6366f1', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', marginBottom: '1rem' }}>
              {authMode === 'signin' ? 'Create Account Instead' : 'Sign In Instead'}
            </button>
            <button onClick={() => { setShowAuth(false); setEmail(''); setPassword(''); }} style={{ width: '100%', padding: '0.85rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.95rem' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && user && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem', color: '#1a1a2e' }}>Add Custom Category</h2>
            <input type="text" placeholder="e.g., Los Angeles Lakers" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ width: '100%', padding: '0.85rem', marginBottom: '1.5rem', border: '2px solid rgba(0, 0, 0, 0.1)', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }} />
            <button onClick={handleAddCategory} style={{ width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', marginBottom: '1rem' }}>
              Add Category
            </button>
            <button onClick={() => setShowCategoryModal(false)} style={{ width: '100%', padding: '0.85rem', background: 'none', border: '2px solid rgba(0, 0, 0, 0.1)', color: '#1a1a2e', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {currentView === 'home' && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0.5rem 2rem 2rem 2rem' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {windowWidth <= 1100 && (
              <button onClick={() => setShowCategoryMenu(!showCategoryMenu)} style={{ padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #6366f1', borderRadius: '6px', color: '#6366f1', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                ☰ {selectedCategory}
              </button>
            )}
            {windowWidth <= 900 && (
              <button onClick={() => setShowDayMenu(!showDayMenu)} style={{ padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #6366f1', borderRadius: '6px', color: '#6366f1', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                📅 {availableDays.find(d => d.fullDate === selectedDay)?.label || 'Days'}
              </button>
            )}
            {windowWidth <= 750 && (
              <button onClick={() => setShowTimeMenu(!showTimeMenu)} style={{ padding: '0.5rem 1rem', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid #ec4899', borderRadius: '6px', color: '#ec4899', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                🕐 {availableTimes.find(t => t.value === selectedTime)?.label || 'Times'}
              </button>
            )}
          </div>

          {windowWidth > 1100 && (
            <div style={{ background: 'transparent', padding: '0.1rem 0 0.2rem 0', marginBottom: '0.5rem', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
              <div ref={categoryScrollRef} style={{ display: 'flex', alignItems: 'center', gap: '2rem', overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {allCategories.map(category => (
                  <button key={category} onClick={() => handleSelectCategory(category)} style={{ padding: '0', background: 'none', border: 'none', borderBottom: selectedCategory === category ? '2px solid #6366f1' : '2px solid transparent', color: selectedCategory === category ? '#1a1a2e' : '#6b7280', cursor: 'pointer', fontWeight: selectedCategory === category ? '600' : '500', fontSize: '0.95rem', whiteSpace: 'nowrap', transition: 'all 0.2s ease', letterSpacing: '-0.01em', paddingBottom: '0.3rem' }}>
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {windowWidth > 900 && !isCustomCategory && (
            <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  const newOffset = weekOffset - 1;
                  setWeekOffset(newOffset);
                  setSelectedDay(getDaysOfWeek(newOffset)[6].fullDate);
                }}
                disabled={weekOffset <= -3}
                style={{ padding: '0.4rem 0.6rem', background: weekOffset <= -3 ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '5px', cursor: weekOffset <= -3 ? 'default' : 'pointer', color: weekOffset <= -3 ? '#cbd5e1' : '#6b7280', flexShrink: 0, fontSize: '1rem' }}>
                ‹
              </button>
              <div ref={dayScrollRef} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: '0.5rem', flex: 1 }}>
                {availableDays.map(day => (
                  <button key={day.fullDate} onClick={() => setSelectedDay(day.fullDate)} style={{ padding: '0.6rem 0.95rem', background: selectedDay === day.fullDate ? '#6366f1' : 'rgba(0, 0, 0, 0.04)', color: selectedDay === day.fullDate ? 'white' : '#6b7280', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s ease' }}>
                    {day.label} {day.date}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  const newOffset = weekOffset + 1;
                  setWeekOffset(newOffset);
                  setSelectedDay(getDaysOfWeek(newOffset)[6].fullDate);
                }}
                disabled={weekOffset >= 0}
                style={{ padding: '0.4rem 0.6rem', background: weekOffset >= 0 ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '5px', cursor: weekOffset >= 0 ? 'default' : 'pointer', color: weekOffset >= 0 ? '#cbd5e1' : '#6b7280', flexShrink: 0, fontSize: '1rem' }}>
                ›
              </button>
            </div>
          )}

          {windowWidth > 750 && !isCustomCategory && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div ref={timeScrollRef} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: '0.5rem' }}>
                {availableTimes.map(time => (
                  <button key={time.value} onClick={() => setSelectedTime(time.value)} style={{ padding: '0.6rem 0.95rem', background: selectedTime === time.value ? '#ec4899' : 'rgba(0, 0, 0, 0.04)', color: selectedTime === time.value ? 'white' : '#6b7280', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s ease' }}>
                    {time.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {windowWidth > 750 && isCustomCategory && (
            <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
              {availableDays.map(day => (
                <button key={day.fullDate} onClick={() => setSelectedDay(day.fullDate)} style={{ padding: '0.6rem 0.95rem', background: selectedDay === day.fullDate ? '#6366f1' : 'rgba(0, 0, 0, 0.04)', color: selectedDay === day.fullDate ? 'white' : '#6b7280', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s ease' }}>
                  {day.label} {day.date}
                </button>
              ))}
              <span style={{ color: '#cbd5e1', fontSize: '1rem' }}>|</span>
              {availableTimes.map(time => (
                <button key={time.value} onClick={() => setSelectedTime(time.value)} style={{ padding: '0.6rem 0.95rem', background: selectedTime === time.value ? '#ec4899' : 'rgba(0, 0, 0, 0.04)', color: selectedTime === time.value ? 'white' : '#6b7280', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s ease' }}>
                  {time.label}
                </button>
              ))}
            </div>
          )}

          {showCategoryMenu && windowWidth <= 1100 && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
              <div onClick={() => setShowCategoryMenu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)' }} />
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '280px', background: 'white', boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)', zIndex: 1000, overflowY: 'auto', animation: 'slideIn 0.3s ease' }}>
                <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1a1a2e' }}>Categories</h3>
                    <button onClick={() => setShowCategoryMenu(false)} style={{ padding: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.5rem' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {allCategories.map(category => (
                      <button key={category} onClick={() => { handleSelectCategory(category); setShowCategoryMenu(false); }} style={{ padding: '0.75rem 1rem', background: selectedCategory === category ? 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)' : 'rgba(0, 0, 0, 0.04)', color: selectedCategory === category ? 'white' : '#1a1a2e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: selectedCategory === category ? '600' : '500', fontSize: '0.95rem', textAlign: 'left', transition: 'all 0.2s ease' }}>
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showDayMenu && windowWidth <= 900 && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
              <div onClick={() => setShowDayMenu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)' }} />
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '280px', background: 'white', boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)', zIndex: 1000, overflowY: 'auto', animation: 'slideIn 0.3s ease' }}>
                <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1a1a2e' }}>Days</h3>
                    <button onClick={() => setShowDayMenu(false)} style={{ padding: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.5rem' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {availableDays.map(day => (
                      <button key={day.fullDate} onClick={() => { setSelectedDay(day.fullDate); setShowDayMenu(false); }} style={{ padding: '0.75rem 1rem', background: selectedDay === day.fullDate ? '#6366f1' : 'rgba(0, 0, 0, 0.04)', color: selectedDay === day.fullDate ? 'white' : '#1a1a2e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: selectedDay === day.fullDate ? '600' : '500', fontSize: '0.95rem', textAlign: 'left', transition: 'all 0.2s ease' }}>
                        {day.label} {day.date}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showTimeMenu && windowWidth <= 750 && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
              <div onClick={() => setShowTimeMenu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)' }} />
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '280px', background: 'white', boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)', zIndex: 1000, overflowY: 'auto', animation: 'slideIn 0.3s ease' }}>
                <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1a1a2e' }}>Times</h3>
                    <button onClick={() => setShowTimeMenu(false)} style={{ padding: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.5rem' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {availableTimes.map(time => (
                      <button key={time.value} onClick={() => { setSelectedTime(time.value); setShowTimeMenu(false); }} style={{ padding: '0.75rem 1rem', background: selectedTime === time.value ? '#ec4899' : 'rgba(0, 0, 0, 0.04)', color: selectedTime === time.value ? 'white' : '#1a1a2e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: selectedTime === time.value ? '600' : '500', fontSize: '0.95rem', textAlign: 'left', transition: 'all 0.2s ease' }}>
                        {time.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* News Display */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', minHeight: '400px' }}>
            {newsLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ display: 'inline-block', animation: 'spin 2s linear infinite' }}>
                  <Loader size={64} color="#6366f1" strokeWidth={1.5} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', marginTop: '2rem', color: '#1a1a2e' }}>
                  {customCategories.includes(selectedCategory) ? 'Generating Custom News' : 'Loading Your News'}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                  {customCategories.includes(selectedCategory) ? 'Searching the web and compiling...' : 'Retrieving pre-generated news...'}
                </p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : newsNotAvailable ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>
                <Clock size={48} color="#cbd5e1" style={{ marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.5rem', color: '#64748b' }}>News Not Yet Available</h3>
                <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>This summary hasn't been generated yet.</p>
              </div>
            ) : newsSummary ? (
              <div>
                <div style={{ borderBottom: '2px solid rgba(0, 0, 0, 0.06)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.75rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', lineHeight: '1.2' }}>{newsSummary.category}</h2>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} />
                      <span style={{ fontWeight: '600' }}>{(() => { const dayInfo = daysOfWeek.find(d => d.fullDate === newsSummary.day); return dayInfo ? `${dayInfo.label}, ${dayInfo.date}` : newsSummary.day; })()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={14} />
                      <span style={{ fontWeight: '600' }}>{newsSummary.time_slot}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={14} />
                      <span>{new Date(newsSummary.generated_at).toLocaleString('en-US', { timeZone: 'Asia/Dubai' })}</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.95rem', lineHeight: '1.3', color: '#1e293b', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: newsSummary.content.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 700; color: #1a1a2e;">$1</strong>').replace(/^(#{1,3})\s+(.+)$/gm, (match, hashes, text) => { const level = hashes.length; const sizes = { 1: '1.4rem', 2: '1.2rem', 3: '1.1rem' }; return `<h${level + 2} style="font-size: ${sizes[level]}; font-weight: 800; color: #1a1a2e; margin: 0.5rem 0 0.25rem 0; line-height: 1.2;">${text}</h${level + 2}>`; }).replace(/^- (.+)$/gm, '<div style="margin: 0.25rem 0 0.25rem 1.5rem; padding-left: 0.5rem; border-left: 2px solid #e5e7eb;">$1</div>').replace(/\n\n/g, '<div style="height: 0.25rem;"></div>') }} />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>
                <Sparkles size={48} color="#cbd5e1" style={{ marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.5rem', color: '#64748b' }}>Select your preferences above</h3>
                <p style={{ fontSize: '0.95rem' }}>Your personalized news digest will appear here</p>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Settings View */}
      {currentView === 'settings' && user && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '2rem', background: 'linear-gradient(135deg, #1a1a2e 0%, #64748b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Settings & Preferences</h2>
          <div style={{ display: 'grid', gap: '2rem' }}>
            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0, 0, 0, 0.08)', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Mail size={24} color="#6366f1" strokeWidth={2.5} />
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1a1a2e' }}>Email Digest Preferences</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {timesOfDay.map(time => (
                  <label key={time.value} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: emailPreferences[time.value.toLowerCase()] ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.02)', border: emailPreferences[time.value.toLowerCase()] ? '2px solid #6366f1' : '2px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={emailPreferences[time.value.toLowerCase()] || false} onChange={() => handleEmailPreferenceToggle(time.value.toLowerCase())} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#6366f1' }} />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1a1a2e' }}>{time.label}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{time.time}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0, 0, 0, 0.08)', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Search size={24} color="#ec4899" strokeWidth={2.5} />
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1a1a2e' }}>Your Custom Categories</h3>
                </div>
                <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.75rem 1.5rem', background: 'rgba(99, 102, 241, 0.1)', border: '2px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '700' }}>
                  <Plus size={18} />
                  Add Category
                </button>
              </div>
              {customCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No custom categories yet</p>
                  <p style={{ fontSize: '0.9rem' }}>Create your first personalized news category</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {customCategories.map(category => (
                    <div key={category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                      <span style={{ fontWeight: '600', color: '#1a1a2e' }}>{category}</span>
                      <button onClick={() => handleDeleteCategory(category)} style={{ padding: '0.5rem', background: 'rgba(231, 76, 60, 0.1)', border: 'none', borderRadius: '6px', color: '#e74c3c', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setCurrentView('home')} style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', background: 'rgba(99, 102, 241, 0.1)', border: '2px solid #6366f1', borderRadius: '8px', color: '#6366f1', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}>
            Back to News
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