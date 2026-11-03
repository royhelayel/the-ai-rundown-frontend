import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import GroupedBriefingHeader, { BriefingDatePicker } from './GroupedBriefingHeader';

beforeEach(() => jest.useFakeTimers());
afterEach(() => { act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); });
const finishClose = () => act(() => jest.advanceTimersByTime(300));
const base = { categories:['World News','Technology'], activeCategory:'World News', period:'Daily', lens:'latest', playbackSpeed:1 };

test('topics contain only topics and existing customisation sign-in gate',()=>{
 const edit=jest.fn();render(<GroupedBriefingHeader {...base} onEditCategories={edit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Topic: World'}));
 const sheet=screen.getByRole('dialog',{name:'Choose your news'});
 expect(within(sheet).queryByRole('group',{name:'News selection'})).toBeNull();
 fireEvent.click(within(sheet).getByRole('button',{name:'Customise your mix'}));expect(edit).not.toHaveBeenCalled();finishClose();expect(edit).toHaveBeenCalledTimes(1);
});

test('brief sheet shows edition dates, exact recap windows and independent story selection',()=>{
 const lens=jest.fn(),change=jest.fn();render(<GroupedBriefingHeader {...base} selectedDay="2026-11-03" onChangeLens={lens} onChangePeriod={change}/>);
 fireEvent.click(screen.getByRole('button',{name:'Shorter brief',exact:true}));
 const sheet=screen.getByRole('dialog',{name:'Choose your brief'});
 expect(within(sheet).getByText('For Tue, Nov 3, 2026')).toBeInTheDocument();
 expect(within(sheet).getByText('Oct 26, 2026 – Nov 1, 2026')).toBeInTheDocument();
 expect(within(sheet).getByText('Oct 1, 2026 – Oct 31, 2026')).toBeInTheDocument();
 fireEvent.click(within(sheet).getByRole('button',{name:'Popular',exact:true}));expect(lens).toHaveBeenCalledWith('popular');expect(change).not.toHaveBeenCalled();
});

test('brief selection preserves storage values and Escape dismisses without changing selection', () => {
  const change = jest.fn();
  render(<GroupedBriefingHeader {...base} onChangePeriod={change} />);
  const trigger = screen.getByRole('button',{name:'Shorter brief',exact:true});
  trigger.focus(); fireEvent.click(trigger);
  fireEvent.keyDown(document,{key:'Escape'}); finishClose();
  expect(change).not.toHaveBeenCalled(); expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Short brief',exact:true}));
  finishClose();
  expect(change).toHaveBeenCalledWith('Headlines');
});

test('edition choices escape clipping containers and close before changing the date', () => {
  const change = jest.fn();
  const { container } = render(<div style={{overflow:'hidden',height:44}}><BriefingDatePicker selectedDay="2026-10-31" label="Today" shortLabel="Today" onSelectDay={change} availableDays={[{fullDate:'2026-10-31',label:'Today'},{fullDate:'2026-10-30',label:'Fri, Oct 30'}]} /></div>);
  fireEvent.click(screen.getByRole('button',{name:'Today',exact:true}));
  const sheet=screen.getByRole('dialog',{name:'Choose a day'});
  expect(container.contains(sheet)).toBe(false);
  fireEvent.click(within(sheet).getByRole('button',{name:'Fri, Oct 30'}));
  expect(change).not.toHaveBeenCalled(); finishClose();
  expect(change).toHaveBeenCalledWith('2026-10-30');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
