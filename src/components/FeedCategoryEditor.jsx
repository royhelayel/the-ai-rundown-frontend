import React, { useRef, useState } from 'react';
import { GripVertical, X, Plus } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_PARENT } from '../theme';

/**
 * FeedCategoryEditor — pick the categories for My Feed and drag to rank them.
 * Replaces the old tap-to-number counter. Order of `selected` == story order.
 *
 *   allCategories — every selectable category
 *   selected      — current ordered selection
 *   onChange(next)— persist the new ordered selection
 *
 * Drag uses pointer events (works on touch + mouse) with a local working order
 * during the gesture, committing to onChange only on release (no save spam).
 */
export default function FeedCategoryEditor({ allCategories = [], selected = [], onChange }) {
  const [dragOrder, setDragOrder] = useState(null); // non-null only while dragging
  const [dragY, setDragY] = useState(0);            // translateY of the lifted row
  const drag = useRef({ idx: null, startIdx: null, startY: 0, startOrder: null, order: null, rowStep: 52 });
  const rowsRef = useRef({});

  const list = dragOrder || selected;
  const available = allCategories.filter(c => !list.includes(c));

  const add    = (cat) => onChange([...selected, cat]);
  const remove = (cat) => onChange(selected.filter(c => c !== cat));

  const startDrag = (e, idx, rowEl) => {
    e.preventDefault();
    const rect = rowEl.getBoundingClientRect();
    drag.current = {
      idx, startIdx: idx, startY: e.clientY,
      startOrder: [...selected], order: [...selected],
      rowStep: rect.height + 6, // row height + flex gap
    };
    setDragOrder([...selected]);
    setDragY(0);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
  };

  // Deterministic follow: target slot from pointer delta / row height — no DOM reads,
  // so it never jitters on the frame a reorder happens.
  const onMove = (e) => {
    const { startIdx, startY, startOrder, rowStep } = drag.current;
    if (startIdx == null) return;
    const rawDelta = e.clientY - startY;
    let target = startIdx + Math.round(rawDelta / rowStep);
    target = Math.max(0, Math.min(startOrder.length - 1, target));
    if (target !== drag.current.idx) {
      const next = [...startOrder];
      const [item] = next.splice(startIdx, 1);
      next.splice(target, 0, item);
      drag.current.idx = target;
      drag.current.order = next;
      setDragOrder(next);
    }
    setDragY(rawDelta - (drag.current.idx - startIdx) * rowStep);
  };

  const endDrag = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', endDrag);
    const finalOrder = drag.current.order;
    drag.current = { idx: null, startIdx: null, startY: 0, startOrder: null, order: null, rowStep: 52 };
    setDragOrder(null);
    setDragY(0);
    if (finalOrder) onChange(finalOrder);
  };

  return (
    <div>
      {/* Selected — ranked, draggable */}
      {list.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: available.length ? '1.1rem' : 0 }}>
          {list.map((cat, idx) => {
            const color = CATEGORY_COLORS[cat] || '#6366f1';
            const isDragging = drag.current.idx === idx && dragOrder;
            return (
              <div
                key={cat}
                ref={el => { rowsRef.current[idx] = el; }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '12px',
                  position: 'relative',
                  zIndex: isDragging ? 5 : 1,
                  background: isDragging ? '#fff' : '#f5f5f7',
                  border: `1px solid ${isDragging ? color : 'rgba(0,0,0,0.06)'}`,
                  boxShadow: isDragging ? `0 14px 32px rgba(20,20,40,0.22), 0 0 0 1px ${color}55` : 'none',
                  transform: isDragging ? `translateY(${dragY}px) scale(1.035)` : 'none',
                  opacity: isDragging ? 0.97 : 1,
                  transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.2,0.8,0.3,1), box-shadow 0.15s',
                }}
              >
                <span
                  onPointerDown={e => startDrag(e, idx, e.currentTarget.parentElement)}
                  style={{ display: 'flex', alignItems: 'center', color: isDragging ? color : '#b8b8c4', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', flexShrink: 0, padding: '2px' }}
                  aria-label="Drag to reorder"
                >
                  <GripVertical size={18} />
                </span>
                <span style={{ width: 18, height: 18, borderRadius: '6px', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0a0a0f' }}>{cat}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b0b0bc', flexShrink: 0 }}>{idx + 1}</span>
                <button
                  onClick={() => remove(cat)}
                  style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  aria-label={`Remove ${cat}`}
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ margin: '0 0 1.1rem', fontSize: '0.82rem', color: '#9ca3af', padding: '14px', background: '#f5f5f7', borderRadius: '12px', textAlign: 'center' }}>
          No categories yet — add some below to build your feed.
        </p>
      )}

      {/* Available — tap to add. Parents keep their normal pill; a parent's subcategories
          (e.g. Football/Basketball under Sports) render smaller and indented right after it,
          so the relationship reads without a real tree — order alone carries it, since
          `available` is filtered from `allCategories` and callers keep parent-then-children
          ordering. A subcategory whose parent is already picked (and so isn't in `available`)
          just falls back to a normal-size pill — it has nothing to nest under here. */}
      {available.length > 0 && (
        <>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add categories</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            {available.map(cat => {
              const color = CATEGORY_COLORS[cat] || '#6366f1';
              const parent = CATEGORY_PARENT[cat];
              const isChild = parent && available.includes(parent);
              return (
                <button key={cat} onClick={() => add(cat)}
                  style={isChild ? {
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    marginLeft: '0.5rem',
                    padding: '0.3rem 0.6rem 0.3rem 0.5rem', borderRadius: '999px',
                    border: `1px solid ${color}33`, background: `${color}0d`, color: '#3a3a4a',
                    fontSize: '0.74rem', fontWeight: 500, cursor: 'pointer',
                  } : {
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.38rem 0.7rem 0.38rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#3a3a4a', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer'
                  }}>
                  <Plus size={isChild ? 11 : 13} color={color} />
                  <span style={{ width: isChild ? 6 : 7, height: isChild ? 6 : 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {cat}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
