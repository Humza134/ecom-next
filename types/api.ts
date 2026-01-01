export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error?: {
    code?: string;
    details?: any;
  };
  meta?: Record<string, any>;
};