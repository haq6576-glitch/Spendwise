export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}

export interface Expense {
  id?: string;
  amount: number;
  category: string;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Other';
  date: string;
  note?: string;
  userId: string;
}

export interface Category {
  id?: string;
  name: string;
  icon?: string;
  userId: string;
  isDefault?: boolean;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Other';

export const DEFAULT_CATEGORIES: Partial<Category>[] = [
  { name: 'Food', icon: 'Utensils' },
  { name: 'Transport', icon: 'Car' },
  { name: 'Shopping', icon: 'ShoppingBag' },
  { name: 'Bills', icon: 'Receipt' },
  { name: 'Entertainment', icon: 'Film' },
  { name: 'Health', icon: 'HeartPulse' },
  { name: 'Rent', icon: 'Home' },
  { name: 'Other', icon: 'MoreHorizontal' },
];

export const AVAILABLE_ICONS = [
  'Utensils', 'Car', 'ShoppingBag', 'Receipt', 'Film', 'HeartPulse', 'Home', 
  'MoreHorizontal', 'Coffee', 'Gift', 'GraduationCap', 'Plane', 'Smartphone', 
  'Gamepad2', 'Briefcase', 'Dumbbell', 'PawPrint'
];
