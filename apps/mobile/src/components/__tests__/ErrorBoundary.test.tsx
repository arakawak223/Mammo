import React from 'react';
import { render } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { Text } from 'react-native';

function ThrowingChild(): React.JSX.Element {
  throw new Error('Test error');
}

const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>正常</Text>
      </ErrorBoundary>,
    );
    expect(getByText('正常')).toBeTruthy();
  });

  it('should render error UI when child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(getByText('エラーが発生しました')).toBeTruthy();
    expect(getByText('再試行')).toBeTruthy();
  });

  it('should render custom fallback when provided', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={<Text>カスタムエラー</Text>}>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(getByText('カスタムエラー')).toBeTruthy();
  });
});
