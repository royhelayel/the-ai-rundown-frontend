import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import StoryList from './StoryList';
import ProgressPill from './ProgressPill';

export default function MyFeedTab({
  briefingData, briefingLoading,
  feedCategories, userFeeds,
  selectedDay, availableDays, onSelectDay,
  onSelectCategory, onPlayStory, onMarkRead,
  isNarrating, selectedCategory, currentStoryIndex,
  user, onShowAuth,
  playerVisible, challengeStats, gamifiedStats,
  selectedTime, availableTimes, onSelectTime,
  onPlayFeed, onPlayMyFeed, onPlayCategory,
}) {
  const navigate = useNavigate();
  const allFeedCats = [...new Set((userFeeds || []).flatMap(f => f.categories))];

  if (!user) {
    return (
      <div style={{ background: '#f5f5f7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <style>{`* { box-sizing: border-box; } body { background: #f5f5f7; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,245,247,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '12px 20px 10px' }}>
          <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.025em' }}>My Feed</span>
            <button onClick={onShowAuth} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }}>
              <User size={16} />
            </button>
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', paddingBottom: '6rem', gap: '1rem', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={24} color="#8a8a9a" />
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.02em' }}>Your Personalised Feed</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#8a8a9a', lineHeight: 1.55 }}>Sign in to create your own feed with only the categories you care about.</p>
          </div>
          <button onClick={onShowAuth} style={{ padding: '0.7rem 1.8rem', background: '#0a0a0f', color: 'white', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!userFeeds?.length || allFeedCats.length === 0) {
    return (
      <div style={{ background: '#f5f5f7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <style>{`* { box-sizing: border-box; } body { background: #f5f5f7; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,245,247,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '12px 20px 10px' }}>
          <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.025em' }}>My Feed</span>
            <button onClick={() => navigate('/settings')} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }}>
              <User size={16} />
            </button>
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', paddingBottom: '6rem', gap: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>⭐</div>
          <div>
            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: '900', color: '#0a0a0f' }}>Set Up My Feed</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#8a8a9a', lineHeight: 1.55 }}>Choose the categories you want and we'll keep your feed personalised.</p>
          </div>
          <button onClick={() => navigate('/customize')} style={{ padding: '0.7rem 1.8rem', background: '#0a0a0f', color: 'white', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>
            Set Up My Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: #f5f5f7; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,245,247,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '12px 20px 10px' }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.025em' }}>My Feed</span>
          <button onClick={() => navigate('/settings')} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }}>
            <User size={16} />
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <ProgressPill challengeStats={challengeStats} />
      </div>

      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <StoryList
          availableDays={availableDays}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
          briefingData={briefingData}
          categories={allFeedCats}
          onReadStory={onSelectCategory}
          onPlayStory={onPlayStory}
          gamifiedStats={gamifiedStats}
          isNarrating={isNarrating}
          activeCategory={selectedCategory}
          currentStoryIndex={currentStoryIndex}
          playerVisible={playerVisible}
          challengeStats={challengeStats}
          loading={briefingLoading}
          fromPath="/my-feed"
        />
      </div>
    </div>
  );
}
