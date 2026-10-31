import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import GroupedBriefingHeader, { BriefingDatePicker } from './GroupedBriefingHeader';

beforeEach(() => jest.useFakeTimers());
afterEach(() => { act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); });
const finishClose = () => act(() => jest.advanceTimersByTime(300));
const base = { categories:['World News','Technology'], activeCategory:'World News', period:'Daily', lens:'latest', playbackSpeed:1 };

test('topic sheet keeps feed selection available, and customisation uses the existing sign-in gate', () => {
  const edit = jest.fn(), lens = jest.fn();
  const { rerender } = render(<GroupedBriefingHeader {...base} onEditCategories={edit} onChangeLens={lens} />);
  fireEvent.click(screen.getByRole('button',{name:'Topic: World'}));
  let sheet = screen.getByRole('dialog',{name:'Choose your news'});
  fireEvent.click(within(sheet).getByRole('button',{name:'Popular',exact:true}));
  expect(lens).toHaveBeenCalledWith('popular');
  rerender(<GroupedBriefingHeader {...base} categories={[]} lens="popular" onEditCategories={edit} onChangeLens={lens} />);
  expect(screen.getByText(/No topics are available/)).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Relevant',exact:true})).toBeEnabled();
  fireEvent.click(screen.getByRole('button',{name:'Customise your mix'}));
  expect(edit).not.toHaveBeenCalled();
  finishClose();
  expect(edit).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('brief selection preserves storage values and Escape dismisses without changing selection', () => {
  const change = jest.fn();
  render(<GroupedBriefingHeader {...base} onChangePeriod={change} />);
  const trigger = screen.getByRole('button',{name:'Quick brief',exact:true});
  trigger.focus(); fireEvent.click(trigger);
  fireEvent.keyDown(document,{key:'Escape'}); finishClose();
  expect(change).not.toHaveBeenCalled(); expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Full brief',exact:true}));
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
