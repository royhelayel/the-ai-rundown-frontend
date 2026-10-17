/**
 * FeedHeader — Scroll mode's sticky header, shared by every feed tab.
 *
 * The header itself is AppHeader, the same one Listen and Swipe draw; this wrapper only makes
 * it sticky and publishes its height (below). The old recap strip and lens row are gone: the
 * "12 stories | World recap" tabs and the dropdown beside them replace both.
 */
import React, { useRef, useEffect } from 'react';
import AppHeader from './AppHeader';
import ProgressRail from './ProgressRail';

export default function FeedHeader({
  user,
  selectedDay,
  availableDays = [],
  onSelectDay,
  categories = [],
  activeCategory = null,
  onSelectCategory,
  showAllPill = false,
  progressListened = 0,
  progressTotal = 0,
  showLens = false,
  lens = 'latest',
  onChangeLens,
  onEditCategories,
  // The tabs
  storyCount,
  recapView = false,
  onChangeRecapView,
  recapPeriod = 'Daily',
  onChangeRecapPeriod,
  periodReady,
  canRecap,
  recapCategory,
}) {
  // Publish the sticky header's real height as --header-h.
  //
  // Everything that has to clear this header — where a category jump lands, where the
  // scroll-spy draws its line — reads this rather than hardcoding its own guess at it.
  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => document.documentElement.style.setProperty('--header-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
    {/* Opaque, not blurred: backdrop-filter on a sticky element re-blurs on every scroll
        frame, a known cause of stutter on iOS Safari. */}
    <header ref={headerRef} style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--paper)' }}>
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto' }}>
        <AppHeader
          selectedDay={selectedDay} availableDays={availableDays} onSelectDay={onSelectDay}
          categories={categories} activeCategory={activeCategory} onSelectCategory={onSelectCategory}
          showAllPill={showAllPill} allActive={showAllPill && activeCategory === null}
          onSelectAll={() => onSelectCategory?.(null)}
          onEditCategories={onEditCategories} user={user}
          showTabs={showLens || !!onChangeRecapView}
          storyCount={storyCount ?? progressTotal}
          recapView={recapView} onChangeRecapView={onChangeRecapView}
          canRecap={canRecap ?? !!onChangeRecapView} recapCategory={recapCategory}
          lens={lens} onChangeLens={onChangeLens}
          period={recapPeriod} onChangePeriod={onChangeRecapPeriod} periodReady={periodReady}
        />
      </div>
    </header>

    {/* Progress lives on a vertical rail beside the feed. Rendered outside the header so a
        sticky ancestor can't trap the fixed-position rail. */}
    {!recapView && <ProgressRail filled={progressListened} total={progressTotal} theme="light" position="fixed" />}
    </>
  );
}
