import { render } from '@testing-library/react';
import App from './App';

test('app renders without crashing', () => {
  render(<App />);
  // If we get here, the component rendered without throwing
  expect(true).toBe(true);
});

test('lifty game component renders', () => {
  const { container } = render(<App />);
  const canvasElements = container.querySelectorAll('canvas');
  expect(canvasElements.length).toBeGreaterThan(0);
});
