import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, User, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

const FEED_COLOR = '#7c3aed';

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function CustomizeTab({
  userFeeds, onSaveUserFeeds,
  feedCategories, onSaveFeedCategories,
  defaultCategories,
  user, onShowAuth,
  playerVisible,
}) {
  const navigate = useNavigate();

  // Create form
  const [feedName,   setFeedName]   = useState('');
  const [selected,   setSelected]   = useState([]);
  const [nameError,  setNameError]  = useState('');

  // Edit state
  const [editingId,     setEditingId]     = useState(null);
  const [editName,      setEditName]      = useState('');
  const [editSelected,  setEditSelected]  = useState([]);
  const [editNameError, setEditNameError] = useState('');

  const toggleCat = (cat) =>
    setSelected(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const toggleEditCat = (cat) =>
    setEditSelected(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const handleCreate = () => {
    const trimmed = feedName.trim();
    if (!trimmed) { setNameError('Please enter a feed name.'); return; }
    if (selected.length === 0) { setNameError('Select at least one category.'); return; }
    setNameError('');
    const newFeed = { id: genId(), name: trimmed, categories: selected };
    onSaveUserFeeds([...(userFeeds || []), newFeed]);
    setFeedName('');
    setSelected([]);
  };

  const handleDelete = (id) => {
    onSaveUserFeeds((userFeeds || []).filter(f => f.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (feed) => {
    setEditingId(feed.id);
    setEditName(feed.name);
    setEditSelected([...feed.categories]);
    setEditNameError('');
  };

  const cancelEdit = () => { setEditingId(null); setEditNameError(''); };

  const saveEdit = (id) => {
    const trimmed = editName.trim();
    if (!trimmed) { setEditNameError('Please enter a feed name.'); return; }
    if (editSelected.length === 0) { setEditNameError('Select at least one category.'); return; }
    onSaveUserFeeds((userFeeds || []).map(f =>
      f.id === id ? { ...f, name: trimmed, categories: editSelected } : f
    ));
    setEditingId(null);
  };

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: ${light.bg}; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${light.bg}f0`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${light.border}`, padding: '0.9rem 1.25rem' }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <span className="header-brand" style={{ fontSize: '1.15rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em' }}>The Rundown</span>
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '1.5rem 1.25rem', paddingBottom: playerVisible ? '8rem' : '3.5rem' }}>

        <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.5rem', fontWeight: '900', color: light.text, letterSpacing: '-0.03em' }}>Manage Feeds</h1>
        <p style={{ margin: '0 0 1.75rem', fontSize: '0.85rem', color: light.textMuted }}>Create and edit your personalised feeds.</p>

        {/* Not logged in */}
        {!user ? (
          <div style={{ padding: '1.5rem', background: light.bgSub, borderRadius: '16px', border: `1px solid ${light.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', textAlign: 'center' }}>
            <User size={28} color={light.textMuted} />
            <div>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.95rem', fontWeight: '700', color: light.text }}>Sign in to create feeds</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: light.textMuted }}>Your feeds are saved to your account.</p>
            </div>
            <button onClick={onShowAuth}
              style={{ padding: '0.6rem 1.5rem', background: light.text, color: 'white', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer' }}>
              Sign In
            </button>
          </div>
        ) : (
          <>
            {/* ── Existing feeds ── */}
            {userFeeds?.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ margin: '0 0 0.65rem', fontSize: '0.72rem', fontWeight: '800', color: FEED_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Your Feeds
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {userFeeds.map(feed => (
                    <div key={feed.id}
                      style={{ background: light.bgSub, border: `1px solid ${editingId === feed.id ? FEED_COLOR + '50' : light.border}`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.15s' }}>

                      {/* Feed summary row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.85rem 1rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: '0 0 0.2rem', fontSize: '0.92rem', fontWeight: '700', color: light.text }}>{feed.name}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: light.textMuted }}>
                            {feed.categories.length} {feed.categories.length === 1 ? 'category' : 'categories'}
                            {' · '}{feed.categories.slice(0, 3).join(', ')}{feed.categories.length > 3 ? '…' : ''}
                          </p>
                        </div>

                        {editingId !== feed.id ? (
                          <>
                            <button onClick={() => navigate(`/feed/${feed.id}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', background: `${FEED_COLOR}12`, border: `1px solid ${FEED_COLOR}30`, borderRadius: '999px', color: FEED_COLOR, fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                              View <ChevronRight size={11} />
                            </button>
                            <button onClick={() => startEdit(feed)}
                              style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'transparent', border: `1px solid ${light.border}`, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(feed.id)}
                              style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'transparent', border: `1px solid ${light.border}`, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => saveEdit(feed.id)}
                              style={{ width: '30px', height: '30px', borderRadius: '50%', background: FEED_COLOR, border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Check size={14} />
                            </button>
                            <button onClick={cancelEdit}
                              style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'transparent', border: `1px solid ${light.border}`, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Inline edit form */}
                      {editingId === feed.id && (
                        <div style={{ padding: '0 1rem 1rem', borderTop: `1px solid ${light.border}` }}>
                          <p style={{ margin: '0.85rem 0 0.4rem', fontSize: '0.72rem', fontWeight: '700', color: light.textMuted }}>Feed name</p>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => { setEditName(e.target.value); setEditNameError(''); }}
                            style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '10px', border: `1px solid ${editNameError ? '#e11d48' : light.border}`, background: light.bg, fontSize: '0.88rem', color: light.text, outline: 'none', marginBottom: editNameError ? '0.3rem' : '0.85rem', fontFamily: 'inherit' }}
                          />
                          {editNameError && <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', color: '#e11d48' }}>{editNameError}</p>}

                          <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: '700', color: light.textMuted }}>Categories</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                            {defaultCategories.map(cat => {
                              const isOn  = editSelected.includes(cat);
                              const color = CATEGORY_COLORS[cat] || '#6366f1';
                              return (
                                <button key={cat} onClick={() => toggleEditCat(cat)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', borderRadius: '999px', border: `1px solid ${isOn ? color + '60' : light.border}`, background: isOn ? `${color}15` : light.bg, color: isOn ? color : light.textMuted, fontSize: '0.8rem', fontWeight: isOn ? '700' : '500', cursor: 'pointer', transition: 'all 0.12s' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                                  {cat}
                                </button>
                              );
                            })}
                          </div>

                          <button onClick={() => saveEdit(feed.id)}
                            style={{ width: '100%', padding: '0.65rem', background: editName.trim() && editSelected.length > 0 ? FEED_COLOR : light.border, color: editName.trim() && editSelected.length > 0 ? 'white' : light.textMuted, border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.88rem', cursor: editName.trim() && editSelected.length > 0 ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                            Save Changes
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Create new feed ── */}
            <div style={{ padding: '1.25rem', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '16px' }}>
              <p style={{ margin: '0 0 0.9rem', fontSize: '0.72rem', fontWeight: '800', color: FEED_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                New Feed
              </p>

              <input
                type="text"
                placeholder="Feed name (e.g. Tech & Markets)"
                value={feedName}
                onChange={e => { setFeedName(e.target.value); setNameError(''); }}
                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: `1px solid ${nameError ? '#e11d48' : light.border}`, background: light.bg, fontSize: '0.9rem', color: light.text, outline: 'none', marginBottom: nameError ? '0.35rem' : '1rem', fontFamily: 'inherit' }}
              />
              {nameError && <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: '#e11d48' }}>{nameError}</p>}

              <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: '600', color: light.textMuted }}>Select categories</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                {defaultCategories.map(cat => {
                  const isOn  = selected.includes(cat);
                  const color = CATEGORY_COLORS[cat] || '#6366f1';
                  return (
                    <button key={cat} onClick={() => toggleCat(cat)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', borderRadius: '999px', border: `1px solid ${isOn ? color + '60' : light.border}`, background: isOn ? `${color}15` : light.bg, color: isOn ? color : light.textMuted, fontSize: '0.8rem', fontWeight: isOn ? '700' : '500', cursor: 'pointer', transition: 'all 0.12s' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      {cat}
                    </button>
                  );
                })}
              </div>

              <button onClick={handleCreate}
                style={{ width: '100%', padding: '0.72rem', background: selected.length > 0 && feedName.trim() ? light.text : light.border, color: selected.length > 0 && feedName.trim() ? 'white' : light.textMuted, border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.9rem', cursor: selected.length > 0 && feedName.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.15s' }}>
                <Plus size={16} />
                Create Feed
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
