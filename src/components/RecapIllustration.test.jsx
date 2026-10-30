import { render, screen } from '@testing-library/react';
import RecapIllustration from './RecapIllustration';
import { illustrationFor } from '../lib/recapScenes';

const waxcaps = "Mycologists on the Calf of Man identified 18 waxcap species, doubling the island's previously known count, including the date waxcap, one of Britain's rarest fungi.";

test('the Microsoft explainer stages workforce arrival then highlights the reported share, reversibly',()=>{
 const art=illustrationFor('Microsoft offers buyouts to about 60,000 employees—roughly 27 percent of its workforce.');
 const {container,rerender}=render(<RecapIllustration illustration={art} phase={0} animate/>);
 const first=container.querySelector('.rn-recap-workforce>span').getAttribute('style');
 expect(container.querySelectorAll('.is-highlighted')).toHaveLength(0);
 rerender(<RecapIllustration illustration={art} phase={1} animate/>);
 expect(container.querySelectorAll('.is-highlighted')).toHaveLength(27);
 expect(screen.getByText('employees')).toBeInTheDocument();expect(screen.getByText('roughly 27 %')).toBeInTheDocument();
 rerender(<RecapIllustration illustration={art} phase={0} animate/>);
 expect(container.querySelector('.rn-recap-workforce>span')).toHaveAttribute('style',first);
 expect(container.querySelectorAll('.is-highlighted')).toHaveLength(0);
});

test('the published waxcap update shows the species and location with its fungi illustration', () => {
  const art = illustrationFor(waxcaps);
  const { container } = render(<RecapIllustration illustration={art} phase={.5} animate />);
  expect(art.type).toBe('fungi');
  expect(screen.getByText('18 waxcap species')).toBeInTheDocument();
  expect(screen.getByText(waxcaps)).toBeInTheDocument();
  expect(container.querySelectorAll('.rn-recap-mushroom')).toHaveLength(3);
  expect(screen.queryByText('18', { exact: true })).not.toBeInTheDocument();
});

test('generic figures retain the complete reported context and qualifiers', () => {
  const text = 'Officials say the proposed device could cost about $699, but the price is not confirmed.';
  render(<RecapIllustration illustration={illustrationFor(text)} phase={.8} animate />);
  expect(screen.getByText('about')).toBeInTheDocument();
  expect(screen.getByText('$699')).toBeInTheDocument();
  expect(screen.getByText(text)).toBeInTheDocument();
});

test('unstructured updates display real facts instead of a decorative newspaper', () => {
  const text = 'Researchers warn that the treatment has not yet been tested in people.';
  const { container } = render(<RecapIllustration illustration={illustrationFor(text)} phase={.5} animate />);
  expect(screen.getByText(text)).toBeInTheDocument();
  expect(container.querySelector('svg')).toBeNull();
});

test('fact transitions preserve the sentence attached to each figure', () => {
  const text = 'Funding reached $20 million. The prototype costs $699.';
  const art = illustrationFor(text);
  const { rerender } = render(<RecapIllustration illustration={art} phase={0} animate />);
  expect(screen.getByText('Funding reached $20 million.')).toBeInTheDocument();
  rerender(<RecapIllustration illustration={art} phase={1} animate />);
  expect(screen.getByText('The prototype costs $699.')).toBeInTheDocument();
  expect(screen.queryByText('Funding reached $20 million.')).not.toBeInTheDocument();
});

test('fungi with no reported species count use factual text rather than inventing a count', () => {
  const text = 'Mycologists found rare fungi on the island.';
  render(<RecapIllustration illustration={illustrationFor(text)} phase={.5} animate={false} />);
  expect(screen.getByText(text)).toBeInTheDocument();
  expect(screen.queryByText(/18/)).not.toBeInTheDocument();
});

test('a reported device replacement moves between phones without inventing an unreported crack',()=>{
 const art=illustrationFor('Apple will replace affected iPhone handsets with screen problems.');
 const {container,rerender}=render(<RecapIllustration illustration={art} phase={0} animate/>);
 expect(container.querySelector('.rn-recap-device-replacement')).toHaveStyle({opacity:0});
 expect(container.querySelector('.rn-recap-crack')).toBeNull();
 rerender(<RecapIllustration illustration={art} phase={1} animate/>);
 expect(container.querySelector('.rn-recap-device-replacement')).toHaveStyle({opacity:1});
 expect(screen.getByText('replace')).toBeInTheDocument();
});
