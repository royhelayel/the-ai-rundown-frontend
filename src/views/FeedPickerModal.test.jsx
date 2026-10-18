import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedPickerModal from './FeedPickerModal';

const base = { setShowFeedPicker: jest.fn(), feedPickerDraft: ['Technology'], setFeedPickerDraft: jest.fn(), defaultCategories: ['Technology', 'World News'], restoreCategories: ['World News'], saveFeedCategories: jest.fn(), onSignIn: jest.fn() };
beforeEach(() => jest.clearAllMocks());
test('guest must sign in and cannot save categories', async () => {
  render(<FeedPickerModal {...base} user={null} />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in to choose categories' }));
  await waitFor(() => expect(base.onSignIn).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('button', { name: 'Save categories' })).not.toBeInTheDocument();
  expect(base.saveFeedCategories).not.toHaveBeenCalled();
});
test('failed save keeps the sheet open and offers retry', async () => {
  const save = jest.fn().mockRejectedValue(new Error('offline'));
  render(<FeedPickerModal {...base} user={{ id: 1 }} saveFeedCategories={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save categories' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t be saved');
  expect(base.setShowFeedPicker).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save categories' })).toBeEnabled();
});
test('empty selection is blocked; a saved selection closes the sheet', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  const { rerender } = render(<FeedPickerModal {...base} user={{ id: 1 }} feedPickerDraft={[]} saveFeedCategories={save} />);
  expect(screen.getByRole('button', { name: 'Save categories' })).toBeDisabled();
  rerender(<FeedPickerModal {...base} user={{ id: 1 }} saveFeedCategories={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save categories' }));
  await waitFor(() => expect(base.setShowFeedPicker).toHaveBeenCalledWith(false));
  expect(save).toHaveBeenCalledWith(['Technology']);
});
test('closing discards the local draft without saving', async () => {
  render(<FeedPickerModal {...base} user={{ id: 1 }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Close categories' }));
  await waitFor(() => expect(base.setShowFeedPicker).toHaveBeenCalledWith(false));
  expect(base.saveFeedCategories).not.toHaveBeenCalled();
});
