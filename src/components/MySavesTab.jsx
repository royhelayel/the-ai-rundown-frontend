import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, ChevronLeft } from 'lucide-react';
import StoryList from './StoryList';
import FeedHeader from './FeedHeader';
import useScrollRestore from '../hooks/useScrollRestore';

// My Interesting — the stories this user flagged, rendered as their own feed.
// Reached from My Profile in Settings; it used to hang off the Interesting tab, which is the
// shared view of what readers collectively flagged.
// Mirrors the other feeds (day nav + category-grouped StoryList) but sources its
// data from saved snapshots (savesBriefingData) instead of live news.
export default function MySavesTab({
  briefingData = {},
  selectedDay, availableDays = [], onSelectDay,
  onSelectCategory, onPlayStory, onPlayCategory, onPlayFeed,
  gamifiedStats = {}, user, onShowAuth,
  isNarrating, selectedCategory, currentStoryIndex,
  playerVisible, challengeStats,
}) {
  const navigate = useNavigate();
  useScrollRestore('/saved');

  const categories = Object.keys(briefingData).filter(c => briefingData[c]?.storyCount > 0);
  const hasAny = categories.length > 0;

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: #f5f5f7; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>

      <FeedHeader
        user={user}
        onShowAuth={onShowAuth}
        selectedDay={selectedDay}
        availableDays={availableDays}
        onSelectDay={onSelectDay}
      />

      {/* Back to Interesting */}
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '12px 16px 0' }}>
        <button
          onClick={() => navigate('/important')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px', borderRadius: '999px',
            background: '#ececef', border: '1px solid rgba(0,0,0,0.08)',
            color: '#3a3a4a', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
          }}
        >
          <ChevronLeft size={15} /> Interesting
        </button>
      </div>

      {!hasAny ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 2rem', gap: '1rem', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ececef', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bookmark size={22} color="#8a8a9a" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: '800', color: '#0a0a0f' }}>
              {user ? 'Nothing marked interesting for this day' : 'Sign in to mark stories interesting'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#8a8a9a', lineHeight: 1.55 }}>
              {user
                ? 'Tap the bookmark on any story to mark it as interesting. Use the day picker above to find earlier saves.'
                : 'Sign in, then tap the bookmark on any story to keep it here.'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
          <StoryList
            availableDays={availableDays}
            selectedDay={selectedDay}
            onSelectDay={onSelectDay}
            briefingData={briefingData}
            categories={categories}
            onReadStory={onSelectCategory}
            onPlayStory={onPlayStory}
            onPlayCategory={onPlayCategory}
            gamifiedStats={gamifiedStats}
            user={user}
            isNarrating={isNarrating}
            activeCategory={selectedCategory}
            currentStoryIndex={currentStoryIndex}
            playerVisible={playerVisible}
            challengeStats={challengeStats}
            loading={false}
            fromPath="/saved"
            sectionTitle="My Interesting"
            onPlayFeed={onPlayFeed}
          />
        </div>
      )}
    </div>
  );
}
