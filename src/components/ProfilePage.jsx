import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, UserPlus, UserCheck, Bookmark, Users } from 'lucide-react';
import StoryCard from './StoryCard';
import FeedHeader from './FeedHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const light = {
  bg: '#f5f5f7',
  bgCard: '#ffffff',
  bgSub: '#ececef',
  border: 'rgba(0,0,0,0.08)',
  text: '#0a0a0f',
  textSub: '#3a3a4a',
  textMuted: '#8a8a9a',
};

function Avatar({ displayName, avatarColor, size = 64 }) {
  const initials = (displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarColor || '#6366f1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: '800', color: '#fff', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function ProfilePage({
  username,
  user,
  onShowAuth,
  briefingData = {},
  onSelectCategory,
  onPlayStory,
  playerVisible,
  gamifiedStats = {},
}) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = user && profile && user.id === profile.id;

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${BACKEND_URL}/api/social/profile/${encodeURIComponent(username)}${user ? `?requesterId=${user.id}` : ''}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setProfile(data);
        setFollowing(data.isFollowing || false);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [username, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFollow = async () => {
    if (!user) { onShowAuth?.(); return; }
    setFollowLoading(true);
    if (following) {
      await fetch(`${BACKEND_URL}/api/social/follow/${profile.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      setFollowing(false);
      setProfile(p => p ? { ...p, followerCount: Math.max(0, (p.followerCount || 1) - 1) } : p);
    } else {
      await fetch(`${BACKEND_URL}/api/social/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: user.id, following_id: profile.id }),
      });
      setFollowing(true);
      setProfile(p => p ? { ...p, followerCount: (p.followerCount || 0) + 1 } : p);
    }
    setFollowLoading(false);
  };

  // Enrich saved story stubs with full story data from briefingData
  const enrichedSaves = (profile?.saves || []).map(item => {
    const full = briefingData[item.category]?.allStories?.[item.story_index];
    return full
      ? { ...full, category: item.category, storyIndex: item.story_index }
      : { headline: item.headline, allBullets: [item.preview], category: item.category, storyIndex: item.story_index, storySources: [] };
  });

  if (loading) {
    return (
      <div style={{ background: light.bg, minHeight: '100dvh' }}>
        <FeedHeader user={user} onShowAuth={onShowAuth} />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 1rem' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={{ background: light.bg, minHeight: '100dvh' }}>
        <FeedHeader user={user} onShowAuth={onShowAuth} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', gap: '1rem', textAlign: 'center' }}>
          <Users size={40} color={light.textMuted} />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: light.text }}>User not found</h2>
          <p style={{ margin: 0, color: light.textMuted, fontSize: '0.9rem' }}>@{username} doesn't exist or hasn't verified their account.</p>
          <button onClick={() => navigate(-1)} style={{ marginTop: '0.5rem', padding: '0.6rem 1.4rem', background: light.text, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: ${light.bg}; margin: 0; } ::-webkit-scrollbar { display: none; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,245,247,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', background: '#fff', border: `1px solid ${light.border}`, borderRadius: '999px', color: light.textMuted, cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>
          <ChevronLeft size={16} /> Back
        </button>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: light.text, flex: 1 }}>@{profile.username}</h2>
      </div>

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        {/* Profile card */}
        <div style={{ padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <Avatar displayName={profile.display_name || profile.username} avatarColor={profile.avatar_color} size={72} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: light.text, marginBottom: '2px' }}>{profile.display_name || profile.username}</div>
              <div style={{ fontSize: '0.85rem', color: light.textMuted, marginBottom: '12px' }}>@{profile.username}</div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: light.text }}>{profile.followerCount || 0}</div>
                  <div style={{ fontSize: '0.72rem', color: light.textMuted, fontWeight: '600' }}>Followers</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: light.text }}>{profile.followingCount || 0}</div>
                  <div style={{ fontSize: '0.72rem', color: light.textMuted, fontWeight: '600' }}>Following</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: light.text }}>{enrichedSaves.length}</div>
                  <div style={{ fontSize: '0.72rem', color: light.textMuted, fontWeight: '600' }}>Saved</div>
                </div>
              </div>
            </div>
          </div>

          {/* Follow / Edit button */}
          {!isOwnProfile && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '0.65rem 1.4rem', borderRadius: '999px', fontWeight: '700', fontSize: '0.9rem',
                cursor: followLoading ? 'default' : 'pointer', width: '100%',
                border: following ? `1.5px solid ${light.border}` : 'none',
                background: following ? light.bgCard : '#0a0a0f',
                color: following ? light.text : '#fff',
                transition: 'all 0.15s',
              }}
            >
              {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
              {followLoading ? '…' : following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: light.border, margin: '0 16px' }} />

        {/* Saved stories */}
        <div style={{ padding: '16px 0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px 12px' }}>
            <Bookmark size={16} color={light.textMuted} />
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: light.textMuted }}>
              {enrichedSaves.length === 0 ? 'No saved stories yet' : `${enrichedSaves.length} saved ${enrichedSaves.length === 1 ? 'story' : 'stories'}`}
            </span>
          </div>

          {enrichedSaves.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px', paddingBottom: playerVisible ? '8rem' : '5rem' }}>
              {enrichedSaves.map((item) => {
                const isRead = !!(gamifiedStats.todayProgress?.[item.category]?.listenedIndices?.has(item.storyIndex));
                return (
                  <StoryCard
                    key={`${item.category}|${item.storyIndex}`}
                    story={item}
                    category={item.category}
                    isRead={user ? isRead : undefined}
                    onRead={() => { onSelectCategory?.(item.category); navigate(`/category/${encodeURIComponent(item.category)}/story/${item.storyIndex}`, { state: { from: `/profile/${username}` } }); }}
                    onPlay={() => onPlayStory?.(item.category, item.storyIndex)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
