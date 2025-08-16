import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../components/login';
import { BrowserRouter } from 'react-router-dom';

describe('Login Component', () => {
  test('renders login form', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    expect(screen.getByLabelText(/email input/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password input/i)).toBeInTheDocument();
  });

  test('updates input fields', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    const emailInput = screen.getByLabelText(/email input/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');
  });
});